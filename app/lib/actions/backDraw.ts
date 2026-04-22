import mongoose from "mongoose";

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

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

export type MainBracketShape = {
  size: number;
  r1Matches: { slot: number; highSeed: number; lowSeed: number }[];
  byeSeeds: { seed: number; r2Slot: number; isTeam1: boolean }[];
};

export function computeMainShape(teamCount: number, r1Size: number): MainBracketShape {
  const size = r1Size;
  const order = seedOrder(size);
  const r1Matches: MainBracketShape["r1Matches"] = [];
  const byeSeeds: MainBracketShape["byeSeeds"] = [];
  for (let i = 0; i < size; i++) {
    const highSeed = order[i];
    const lowSeed = 2 * size + 1 - highSeed;
    const hasHigh = highSeed <= teamCount;
    const hasLow = lowSeed <= teamCount;
    const r1Slot = size + i;
    if (hasHigh && hasLow) {
      r1Matches.push({ slot: r1Slot, highSeed, lowSeed });
    } else if (hasHigh && !hasLow) {
      const r2Slot = Math.floor(r1Slot / 2);
      byeSeeds.push({ seed: highSeed, r2Slot, isTeam1: r1Slot % 2 === 0 });
    }
  }
  return { size, r1Matches, byeSeeds };
}

export type BackDropTarget = {
  backSlot: number;
  position: 1 | 2;
};

export type BackMatchDef = {
  slot: number;
  round: string;
};

export type BackDrawLayout = {
  bSize: number;
  matches: BackMatchDef[];
  // Map from main bracket slot → back-draw destination for the loser of that match,
  // IFF that would be the loser's first match. Missing key = no routing.
  // For R2+ slots with ambiguous first-match status (depends which team loses),
  // we produce an entry; the caller checks at runtime whether the specific loser
  // is a first-match loser and uses the entry only then.
  dropTargets: Map<number, BackDropTarget>;
};

function backRoundName(slot: number, bSize: number): string {
  const depth = Math.floor(Math.log2(slot));
  const totalRounds = Math.log2(bSize) + 1;
  if (depth === 0) return "B-Final";
  if (depth === 1) return "B-SF";
  if (depth === 2) return "B-QF";
  if (depth === totalRounds - 1) return "B-R1";
  return `B-R${1 << depth}`;
}

/**
 * Compute the back-draw skeleton for a single-elim + back-draw division.
 *
 * Strategy: first-match losers drop into back-draw slots in a staggered shape.
 * - Main R1 losers → back-R1 (paired by mirrored sub-tree).
 * - Main R2 first-match losers (bye teams who lost) → back-R2 (paired with back-R1 winners).
 * - SF losers and beyond do NOT drop (they've already played ≥2 matches).
 *
 * We build the back draw by starting from main R1 (which feeds it), then at each
 * subsequent main round, potential bye-team first-match losers get absorbed into
 * the next back-draw round.
 */
export function computeBackDrawLayout(shape: MainBracketShape): BackDrawLayout {
  const { size, r1Matches, byeSeeds } = shape;

  // Back-draw size: enough slots to hold main R1 losers (r1Matches.length teams).
  // If no R1 matches, no back draw.
  if (r1Matches.length < 2 && byeSeeds.length === 0) {
    return { bSize: 0, matches: [], dropTargets: new Map() };
  }

  // Back-draw R1 count: r1Matches.length losers means r1Matches.length/2 matches,
  // but we use power-of-2 sizing with BYE handling in the back draw too.
  const bR1Count = Math.max(1, Math.ceil(r1Matches.length / 2));
  const bSize = nextPow2(bR1Count);

  const matches: BackMatchDef[] = [];
  const dropTargets = new Map<number, BackDropTarget>();

  // Live slot tracker so we only emit matches that will actually host teams.
  const live = new Set<number>();

  // --- Back-R1: pair main R1 losers ---
  // Sort main R1 matches by main slot so that siblings in the main bracket are
  // adjacent in the back draw — keeps losers within their local sub-bracket.
  const r1Sorted = [...r1Matches].sort((a, b) => a.slot - b.slot);
  for (let i = 0; i < r1Sorted.length; i++) {
    const bR1Slot = bSize + Math.floor(i / 2);
    const position: 1 | 2 = i % 2 === 0 ? 1 : 2;
    dropTargets.set(r1Sorted[i].slot, { backSlot: bR1Slot, position });
    live.add(bR1Slot);
  }

  // --- Back-R2+: absorb bye-team first-match losers from main R2 ---
  // In the current bracket generator, byes only land in R2 (not deeper). So the
  // only R2+ first-match-loser-producing slots are R2 slots with a bye team.
  // A main R2 slot with a bye has the bye team pre-placed as team1 or team2;
  // that team's first match is the R2 match. If they lose, they drop.
  // Back-draw R2 slots: [bSize/2, bSize-1]. Each is paired with a back-R1
  // winner at its two children. We place main R2 bye-losers into back-R2 slots
  // mirroring the main R2 slot where possible.

  if (bSize >= 2) {
    // Which main R2 slots have a bye team?
    const byeMainR2Slots = new Set(byeSeeds.map((b) => b.r2Slot));

    // Assign back-R2 slots for these main R2 slots. We pair each main R2 bye
    // slot with one back-R1 sub-tree. Iterate in main-slot order for determinism.
    const sortedByeR2Slots = Array.from(byeMainR2Slots).sort((a, b) => a - b);
    for (let i = 0; i < sortedByeR2Slots.length; i++) {
      const mainR2Slot = sortedByeR2Slots[i];
      // Back-R2 slot i from the back-R1 area = bSize/2 + i (floor division).
      const bR2Slot = Math.max(1, Math.floor(bSize / 2) + Math.floor(i / 2));
      const position: 1 | 2 = i % 2 === 0 ? 1 : 2;
      // Only register if we have space (bSize/2 back-R2 slots × 2 = bSize R2 entries available).
      if (bR2Slot < bSize) {
        dropTargets.set(mainR2Slot, { backSlot: bR2Slot, position });
        live.add(bR2Slot);
      }
    }
  }

  // --- Build live ancestor chain so the bracket forms a connected tree ---
  // Any slot that has descendants in `live` must also be live.
  const toAdd: number[] = Array.from(live);
  for (const slot of toAdd) {
    let s = Math.floor(slot / 2);
    while (s >= 1) {
      live.add(s);
      s = Math.floor(s / 2);
    }
  }

  // Emit match definitions for all live slots.
  for (const slot of Array.from(live).sort((a, b) => a - b)) {
    matches.push({ slot, round: backRoundName(slot, bSize) });
  }

  return { bSize, matches, dropTargets };
}

export function backParentSlot(slot: number): number {
  return Math.floor(slot / 2);
}

/**
 * Given a main match slot and the ID of the losing team, determine whether this
 * was the loser's first played main-bracket match. Used at recordScore time.
 *
 * If there exists any OTHER main-bracket match in this division where the given
 * team appears as a participant AND has a recorded winner, the team has already
 * played. Otherwise this was their first match.
 */
export async function isFirstMainMatchForTeam(
  MatchModel: mongoose.Model<mongoose.Document & { team1Id?: mongoose.Types.ObjectId; team2Id?: mongoose.Types.ObjectId; winnerId?: mongoose.Types.ObjectId; isConsolation: boolean; divisionId: mongoose.Types.ObjectId; _id: mongoose.Types.ObjectId }>,
  divisionId: mongoose.Types.ObjectId,
  currentMatchId: mongoose.Types.ObjectId,
  teamId: mongoose.Types.ObjectId
): Promise<boolean> {
  const prior = await MatchModel.findOne({
    divisionId,
    isConsolation: false,
    _id: { $ne: currentMatchId },
    winnerId: { $exists: true, $ne: null },
    $or: [{ team1Id: teamId }, { team2Id: teamId }],
  }).lean();
  return !prior;
}
