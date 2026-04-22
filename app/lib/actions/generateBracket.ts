"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Team } from "../models/Team";
import { Match } from "../models/Match";
import mongoose from "mongoose";

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Number of first-round (R1) slots for N teams: largest power of 2 such that
// R1 fits — equals N/2 rounded up to next power of 2.
function r1Size(n: number): number {
  if (n <= 2) return 1;
  return nextPow2(Math.ceil(n / 2));
}

// Standard single-elimination seeding order: returns the "high seed" per R1
// match, in bracketSlot order. The low seed of match i is 2*size + 1 - order[i].
// Guarantees seeds 1 and 2 are in opposite halves, 3 and 4 in opposite quarters, etc.
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next: number[] = [];
    const totalSeeds = order.length * 2;
    for (const s of order) {
      next.push(s);
      next.push(totalSeeds + 1 - s);
    }
    order = next;
  }
  return order;
}

// Name rounds by distance from the Final.
// slot 1 = Final; 2,3 = SF; 4..7 = QF; 8..15 = R16; deeper = R1 generic.
function roundName(slot: number, size: number): string {
  // depth = rounds-from-final (0 = final)
  const depth = Math.floor(Math.log2(slot));
  // totalRounds = log2(size) + 1 (size = R1 slot count)
  const totalRounds = Math.log2(size) + 1;
  if (depth === 0) return "Final";
  if (depth === 1) return "SF";
  if (depth === 2) return "QF";
  // R1 is the deepest round (depth == totalRounds - 1)
  if (depth === totalRounds - 1) return "R1";
  if (depth === 3) return "R16";
  return `R${1 << depth}`;
}

export async function generateBracket(
  divisionId: string,
  tournamentSlug: string
): Promise<{ error?: string }> {
  await connectDB();
  const divId = new mongoose.Types.ObjectId(divisionId);

  const teams = await Team.find({ divisionId: divId }).sort({ seed: 1 }).lean();
  if (teams.length < 2) return { error: "Need at least 2 teams to generate a bracket." };

  const size = r1Size(teams.length);
  const byes = 2 * size - teams.length;

  // Clear existing non-consolation matches
  await Match.deleteMany({ divisionId: divId, isConsolation: false });

  // Build all match slots (1..size*2-1), indexed by bracketSlot
  // Upper rounds: slots 1..size-1 (Finals down to R2)
  // R1: slots size..size*2-1

  // Prepare a map of slot -> {team1Id, team2Id} for pre-filling bye seeds
  const slotTeams: Record<number, { team1Id?: mongoose.Types.ObjectId; team2Id?: mongoose.Types.ObjectId }> = {};
  const liveR1: { slot: number; team1Id?: mongoose.Types.ObjectId; team2Id?: mongoose.Types.ObjectId }[] = [];

  // Standard bracket seeding: each R1 match pairs order[i] vs (2*size + 1 - order[i]).
  // Seeds 1..byes skip R1 and advance into their R2 parent.
  const order = seedOrder(size);
  for (let i = 0; i < size; i++) {
    const highSeed = order[i];
    const lowSeed = 2 * size + 1 - highSeed;
    const highTeam = highSeed <= teams.length ? teams[highSeed - 1] : null;
    const lowTeam = lowSeed <= teams.length ? teams[lowSeed - 1] : null;
    const r1Slot = size + i;

    if (highTeam && lowTeam) {
      // Full R1 match
      liveR1.push({
        slot: r1Slot,
        team1Id: highTeam._id as mongoose.Types.ObjectId,
        team2Id: lowTeam._id as mongoose.Types.ObjectId,
      });
    } else if (highTeam && !lowTeam) {
      // High seed gets a bye — advance into R2 parent
      const r2Slot = Math.floor(r1Slot / 2);
      const isEven = r1Slot % 2 === 0;
      if (!slotTeams[r2Slot]) slotTeams[r2Slot] = {};
      if (isEven) {
        slotTeams[r2Slot].team1Id = highTeam._id as mongoose.Types.ObjectId;
      } else {
        slotTeams[r2Slot].team2Id = highTeam._id as mongoose.Types.ObjectId;
      }
    }
    // else: neither team exists — no match at this slot
  }

  // An upper-round slot is "live" if it's an ancestor of a live R1 slot
  // OR has a pre-placed bye seed in slotTeams
  const liveSlots = new Set<number>();
  for (const { slot } of liveR1) {
    let s = Math.floor(slot / 2);
    while (s >= 1) {
      liveSlots.add(s);
      s = Math.floor(s / 2);
    }
  }
  for (const slotStr of Object.keys(slotTeams)) {
    const slot = Number(slotStr);
    let s = slot;
    while (s >= 1) {
      liveSlots.add(s);
      s = Math.floor(s / 2);
    }
  }

  const docs: object[] = [];

  // Upper round slots (only live ones)
  for (const slot of Array.from(liveSlots).sort((a, b) => a - b)) {
    docs.push({
      divisionId: divId,
      round: roundName(slot, size),
      bracketSlot: slot,
      team1Id: slotTeams[slot]?.team1Id ?? undefined,
      team2Id: slotTeams[slot]?.team2Id ?? undefined,
      isConsolation: false,
    });
  }

  // R1 matches (only live ones)
  for (const { slot, team1Id, team2Id } of liveR1) {
    docs.push({
      divisionId: divId,
      round: "R1",
      bracketSlot: slot,
      team1Id,
      team2Id,
      isConsolation: false,
    });
  }

  await Match.insertMany(docs);
  revalidatePath(`/admin/t/${tournamentSlug}`);
  return {};
}
