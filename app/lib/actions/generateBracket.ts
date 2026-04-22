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

  // Seeds 1..byes skip R1 — place them directly into their R2 slot
  // R1 slots are size..size*2-1 (left to right)
  // R2 slots are size/2..size-1
  // R1 slot (size + i) feeds into R2 slot Math.floor((size + i) / 2)
  // team1Id if (size+i) is even, team2Id if odd
  for (let i = 0; i < byes; i++) {
    const byeSeed = teams[i]; // seeds 1..byes (0-indexed: 0..byes-1)
    const r1Slot = size + i;
    const r2Slot = Math.floor(r1Slot / 2);
    const isEven = r1Slot % 2 === 0;
    if (!slotTeams[r2Slot]) slotTeams[r2Slot] = {};
    if (isEven) {
      slotTeams[r2Slot].team1Id = byeSeed._id as mongoose.Types.ObjectId;
    } else {
      slotTeams[r2Slot].team2Id = byeSeed._id as mongoose.Types.ObjectId;
    }
  }

  // Seeds byes+1..teams.length fill R1 in pairs: (byes+1 vs N), (byes+2 vs N-1)...
  const r1Teams = teams.slice(byes); // unseeded block
  const r1Matches: { team1Id?: mongoose.Types.ObjectId; team2Id?: mongoose.Types.ObjectId }[] = [];
  const half = Math.floor(r1Teams.length / 2);
  for (let i = 0; i < half; i++) {
    r1Matches.push({
      team1Id: r1Teams[i]._id as mongoose.Types.ObjectId,
      team2Id: r1Teams[r1Teams.length - 1 - i]._id as mongoose.Types.ObjectId,
    });
  }
  // If odd number in r1Teams, the middle one gets a bye (paired with null)
  if (r1Teams.length % 2 === 1) {
    r1Matches.push({ team1Id: r1Teams[half]._id as mongoose.Types.ObjectId });
  }

  // Build list of live R1 slots (actual matches to play) and their team pairs
  const liveR1: { slot: number; team1Id?: mongoose.Types.ObjectId; team2Id?: mongoose.Types.ObjectId }[] = [];
  for (let mi = 0; mi < r1Matches.length; mi++) {
    const slot = size + byes + mi;
    const pair = r1Matches[mi];
    if (pair.team1Id || pair.team2Id) {
      liveR1.push({ slot, team1Id: pair.team1Id, team2Id: pair.team2Id });
    }
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
