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
  entrySources: Map<string, number>;
};

export function backTargetKey(backSlot: number, position: 1 | 2): string {
  return `${backSlot}:${position}`;
}

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
 * Strategy: build the fixed back-draw tree described in BACKDRAW.md.
 * - The tree always has S/2 entrants, where S is the main-draw size.
 * - Main R1 losers occupy the early back-draw entry positions.
 * - Potential first-match losers from main R2 bye slots occupy the later entry
 *   positions, and may or may not materialize depending on who loses that match.
 */
export function computeBackDrawLayout(shape: MainBracketShape): BackDrawLayout {
  const { size, r1Matches, byeSeeds } = shape;

  // If there are no possible first-match losers, there is no back draw.
  if (r1Matches.length < 2 && byeSeeds.length === 0) {
    return { bSize: 0, matches: [], dropTargets: new Map(), entrySources: new Map() };
  }

  const byeMainR2Slots = Array.from(new Set(byeSeeds.map((b) => b.r2Slot))).sort((a, b) => a - b);
  const bSize = Math.max(1, size / 2);

  const matches: BackMatchDef[] = [];
  const dropTargets = new Map<number, BackDropTarget>();
  const entrySources = new Map<string, number>();

  const entryTargets: BackDropTarget[] = [];
  if (bSize === 1) {
    entryTargets.push({ backSlot: 1, position: 1 }, { backSlot: 1, position: 2 });
  } else {
    const leafSlots = Array.from({ length: bSize }, (_, i) => bSize + i);
    for (const slot of leafSlots) {
      entryTargets.push({ backSlot: slot, position: 1 }, { backSlot: slot, position: 2 });
    }
  }

  let entryIndex = 0;

  const r1Sorted = [...r1Matches].sort((a, b) => a.slot - b.slot);
  for (const r1Match of r1Sorted) {
    const target = entryTargets[entryIndex++]!;
    dropTargets.set(r1Match.slot, target);
    entrySources.set(backTargetKey(target.backSlot, target.position), r1Match.slot);
  }

  for (const mainR2Slot of byeMainR2Slots) {
    const target = entryTargets[entryIndex++]!;
    dropTargets.set(mainR2Slot, target);
    entrySources.set(backTargetKey(target.backSlot, target.position), mainR2Slot);
  }

  for (let slot = 1; slot < bSize * 2; slot++) {
    matches.push({ slot, round: backRoundName(slot, bSize) });
  }

  return { bSize, matches, dropTargets, entrySources };
}

export function eligibleFirstMatchLoserFromMainMatch(
  match: {
    team1Id?: mongoose.Types.ObjectId;
    team2Id?: mongoose.Types.ObjectId;
    winnerId?: mongoose.Types.ObjectId;
    bracketSlot?: number;
  },
  shape: MainBracketShape
): mongoose.Types.ObjectId | undefined {
  if (!match.winnerId || !match.team1Id || !match.team2Id || !match.bracketSlot) return undefined;

  const byeSeed = shape.byeSeeds.find((seed) => seed.r2Slot === match.bracketSlot);
  if (!byeSeed) {
    return match.winnerId.equals(match.team1Id) ? match.team2Id : match.team1Id;
  }

  const byeTeam = byeSeed.isTeam1 ? match.team1Id : match.team2Id;
  return match.winnerId.equals(byeTeam) ? undefined : byeTeam;
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
