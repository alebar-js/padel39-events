/**
 * Backfill: migrate Match.courtLabel (legacy free-text) -> Match.courtId (ref Court).
 *
 * Usage:
 *   MONGODB_URI=... npx tsx scripts/migrate-court-label.ts --dry
 *   MONGODB_URI=... npx tsx scripts/migrate-court-label.ts --apply
 *
 * Safe to re-run: matches already carrying courtId are skipped.
 */

import mongoose from "mongoose";
import { Division } from "../app/lib/models/Division";
import { Court } from "../app/lib/models/Court";

type LegacyMatch = {
  _id: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  courtLabel?: string;
  courtId?: mongoose.Types.ObjectId;
};

async function main() {
  const apply = process.argv.includes("--apply");
  const dry = !apply;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(uri);
  const matches = mongoose.connection.collection<LegacyMatch>("matches");

  const legacy = await matches
    .find({
      courtLabel: { $exists: true, $ne: "" } as unknown as string,
      courtId: { $exists: false },
    })
    .toArray();

  console.log(`Found ${legacy.length} matches with legacy courtLabel`);

  const divisionIds = Array.from(new Set(legacy.map((m) => String(m.divisionId))));
  const divisions = await Division.find({
    _id: { $in: divisionIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();
  const divToTournament = new Map(
    divisions.map((d) => [String(d._id), String(d.tournamentId)])
  );

  const courtCache = new Map<string, mongoose.Types.ObjectId>();
  const orderCache = new Map<string, number>();

  async function getOrCreateCourt(
    tournamentId: string,
    name: string
  ): Promise<mongoose.Types.ObjectId> {
    const key = `${tournamentId}::${name}`;
    const cached = courtCache.get(key);
    if (cached) return cached;

    const tId = new mongoose.Types.ObjectId(tournamentId);
    const existing = await Court.findOne({ tournamentId: tId, name }).lean();
    if (existing) {
      courtCache.set(key, existing._id as mongoose.Types.ObjectId);
      return existing._id as mongoose.Types.ObjectId;
    }

    if (!orderCache.has(tournamentId)) {
      const max = await Court.find({ tournamentId: tId })
        .sort({ order: -1 })
        .limit(1)
        .lean();
      orderCache.set(tournamentId, max[0]?.order ?? 0);
    }
    const nextOrder = (orderCache.get(tournamentId) ?? 0) + 1;
    orderCache.set(tournamentId, nextOrder);

    if (dry) {
      console.log(`[dry] would create Court { tournamentId: ${tournamentId}, name: ${name}, order: ${nextOrder} }`);
      const fakeId = new mongoose.Types.ObjectId();
      courtCache.set(key, fakeId);
      return fakeId;
    }

    const created = await Court.create({ tournamentId: tId, name, order: nextOrder });
    courtCache.set(key, created._id as mongoose.Types.ObjectId);
    return created._id as mongoose.Types.ObjectId;
  }

  let updated = 0;
  for (const m of legacy) {
    const tournamentId = divToTournament.get(String(m.divisionId));
    if (!tournamentId) {
      console.warn(`skip match ${m._id}: division ${m.divisionId} not found`);
      continue;
    }
    const label = (m.courtLabel ?? "").trim();
    if (!label) continue;

    const courtId = await getOrCreateCourt(tournamentId, label);

    if (dry) {
      console.log(`[dry] would set match ${m._id}.courtId = ${courtId}, unset courtLabel`);
    } else {
      await matches.updateOne(
        { _id: m._id },
        { $set: { courtId }, $unset: { courtLabel: "" } }
      );
    }
    updated++;
  }

  console.log(`${dry ? "[dry] " : ""}migrated ${updated} matches`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
