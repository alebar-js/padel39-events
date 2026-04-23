"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connectDB } from "../db";
import { Division } from "../models/Division";
import { Match, type MatchSet } from "../models/Match";
import { Team } from "../models/Team";
import {
  backTargetKey,
  computeBackDrawLayout,
  computeMainShape,
  eligibleFirstMatchLoserFromMainMatch,
  isFirstMainMatchForTeam,
} from "./backDraw";

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function r1Size(n: number): number {
  if (n <= 2) return 1;
  return nextPow2(Math.ceil(n / 2));
}

type MatchSnapshot = {
  _id: mongoose.Types.ObjectId;
  divisionId: mongoose.Types.ObjectId;
  bracketSlot?: number;
  team1Id?: mongoose.Types.ObjectId;
  team2Id?: mongoose.Types.ObjectId;
  winnerId?: mongoose.Types.ObjectId;
};

type EntryState =
  | { kind: "pending" }
  | { kind: "empty" }
  | { kind: "team"; teamId: mongoose.Types.ObjectId };

async function propagateWinner(
  divisionId: mongoose.Types.ObjectId,
  bracketSlot: number,
  isConsolation: boolean,
  winnerId?: mongoose.Types.ObjectId
) {
  const parentSlot = Math.floor(bracketSlot / 2);
  if (parentSlot < 1) return;

  const parentMatch = await Match.findOne({
    divisionId,
    bracketSlot: parentSlot,
    isConsolation,
  });
  if (!parentMatch) return;

  if (bracketSlot % 2 === 0) parentMatch.team1Id = winnerId ?? undefined;
  else parentMatch.team2Id = winnerId ?? undefined;
  await parentMatch.save();
}

async function settleBackDraw(divisionId: mongoose.Types.ObjectId, teamCount: number) {
  const size = r1Size(teamCount);
  const shape = computeMainShape(teamCount, size);
  const layout = computeBackDrawLayout(shape);
  if (layout.matches.length === 0) return;

  const [backMatches, mainMatches] = await Promise.all([
    Match.find({ divisionId, isConsolation: true, bracketSlot: { $exists: true, $ne: null } }),
    Match.find({ divisionId, isConsolation: false, bracketSlot: { $exists: true, $ne: null } }),
  ]);

  const backMap = new Map<number, (typeof backMatches)[number]>();
  for (const backMatch of backMatches) {
    if (backMatch.bracketSlot != null) backMap.set(backMatch.bracketSlot, backMatch);
  }

  const mainMap = new Map<number, MatchSnapshot>();
  for (const mainMatch of mainMatches) {
    if (mainMatch.bracketSlot != null) {
      mainMap.set(mainMatch.bracketSlot, mainMatch.toObject() as MatchSnapshot);
    }
  }

  const leafStart = layout.bSize;
  let changed = true;

  const evaluateEntry = (slot: number, position: 1 | 2): EntryState => {
    const backMatch = backMap.get(slot);
    const currentTeam = position === 1 ? backMatch?.team1Id : backMatch?.team2Id;
    if (currentTeam) return { kind: "team", teamId: currentTeam };

    const sourceSlot = layout.entrySources.get(backTargetKey(slot, position));
    if (sourceSlot == null) return { kind: "empty" };

    const mainMatch = mainMap.get(sourceSlot);
    if (!mainMatch?.winnerId) return { kind: "pending" };

    const eligibleLoser = eligibleFirstMatchLoserFromMainMatch(mainMatch, shape);
    return eligibleLoser ? { kind: "team", teamId: eligibleLoser } : { kind: "empty" };
  };

  const evaluateBackMatch = (slot: number): EntryState => {
    const backMatch = backMap.get(slot);
    if (!backMatch) return { kind: "empty" };
    if (backMatch.winnerId) return { kind: "team", teamId: backMatch.winnerId };

    const left = slot >= leafStart ? evaluateEntry(slot, 1) : evaluateBackMatch(slot * 2);
    const right = slot >= leafStart ? evaluateEntry(slot, 2) : evaluateBackMatch(slot * 2 + 1);

    const team1 = backMatch.team1Id ?? (left.kind === "team" ? left.teamId : undefined);
    const team2 = backMatch.team2Id ?? (right.kind === "team" ? right.teamId : undefined);

    if (team1 && team2) return { kind: "pending" };
    if (team1) return right.kind === "pending" ? { kind: "pending" } : { kind: "team", teamId: team1 };
    if (team2) return left.kind === "pending" ? { kind: "pending" } : { kind: "team", teamId: team2 };
    return left.kind === "pending" || right.kind === "pending" ? { kind: "pending" } : { kind: "empty" };
  };

  while (changed) {
    changed = false;

    for (const [key, sourceSlot] of layout.entrySources.entries()) {
      const [slotStr, posStr] = key.split(":");
      const slot = Number(slotStr);
      const position = Number(posStr) as 1 | 2;
      const backMatch = backMap.get(slot);
      const mainMatch = mainMap.get(sourceSlot);
      if (!backMatch || !mainMatch?.winnerId) continue;

      const eligibleLoser = eligibleFirstMatchLoserFromMainMatch(mainMatch, shape);
      if (!eligibleLoser) continue;

      const existingTeam = position === 1 ? backMatch.team1Id : backMatch.team2Id;
      if (existingTeam?.equals(eligibleLoser)) continue;

      if (position === 1) backMatch.team1Id = eligibleLoser;
      else backMatch.team2Id = eligibleLoser;
      await backMatch.save();
      changed = true;
    }

    for (const slot of Array.from(backMap.keys()).sort((a, b) => b - a)) {
      const backMatch = backMap.get(slot)!;

      if (slot < leafStart) {
        const leftStatus = evaluateBackMatch(slot * 2);
        const rightStatus = evaluateBackMatch(slot * 2 + 1);
        const leftWinner = leftStatus.kind === "team" ? leftStatus.teamId : undefined;
        const rightWinner = rightStatus.kind === "team" ? rightStatus.teamId : undefined;

        const needsLeft = leftWinner ? !backMatch.team1Id?.equals(leftWinner) : !!backMatch.team1Id;
        const needsRight = rightWinner ? !backMatch.team2Id?.equals(rightWinner) : !!backMatch.team2Id;
        if (needsLeft || needsRight) {
          backMatch.team1Id = leftWinner;
          backMatch.team2Id = rightWinner;
          await backMatch.save();
          changed = true;
        }
      }

      if (backMatch.winnerId) continue;

      const status = evaluateBackMatch(slot);
      if (status.kind !== "team") continue;
      if (backMatch.team1Id && backMatch.team2Id) continue;

      backMatch.winnerId = status.teamId;
      await backMatch.save();
      await propagateWinner(divisionId, slot, true, status.teamId);
      changed = true;
    }
  }
}

export async function recordScore(
  matchId: string,
  sets: MatchSet[],
  divisionId: string,
  tournamentSlug: string
): Promise<{ error?: string }> {
  await connectDB();

  const match = await Match.findById(matchId);
  if (!match) return { error: "Match not found." };
  if (!match.bracketSlot && !match.isGroupStage) return { error: "Match has no bracket slot." };
  if (!match.team1Id || !match.team2Id) return { error: "Match is missing a team." };

  const division = await Division.findById(match.divisionId).lean();
  if (!division) return { error: "Division not found." };

  const cleanSets = sets
    .map((s) => ({ team1: Number(s.team1) || 0, team2: Number(s.team2) || 0 }))
    .filter((s, i) => i === 0 || s.team1 > 0 || s.team2 > 0);

  if (cleanSets.length === 0) return { error: "Enter at least one set." };

  const setsNeeded = division.matchFormat === "ONE_SET" ? 1 : 2;
  let team1Sets = 0;
  let team2Sets = 0;
  for (const s of cleanSets) {
    if (s.team1 > s.team2) team1Sets++;
    else if (s.team2 > s.team1) team2Sets++;
  }

  let winnerId: mongoose.Types.ObjectId | undefined;
  let loserId: mongoose.Types.ObjectId | undefined;
  if (team1Sets >= setsNeeded) {
    winnerId = match.team1Id;
    loserId = match.team2Id;
  } else if (team2Sets >= setsNeeded) {
    winnerId = match.team2Id;
    loserId = match.team1Id;
  }

  match.sets = cleanSets;
  match.winnerId = winnerId ?? undefined;
  await match.save();

  if (!match.isGroupStage && match.bracketSlot) {
    await propagateWinner(match.divisionId, match.bracketSlot, match.isConsolation, winnerId);
  }

  if (
    !match.isGroupStage &&
    match.bracketSlot &&
    !match.isConsolation &&
    division.format === "SINGLE_ELIM_CONSOLATION" &&
    loserId
  ) {
    const wasFirstMatch = await isFirstMainMatchForTeam(
      Match as unknown as Parameters<typeof isFirstMainMatchForTeam>[0],
      match.divisionId,
      match._id as mongoose.Types.ObjectId,
      loserId
    );

    const teamCount = await Team.countDocuments({ divisionId: match.divisionId });

    if (wasFirstMatch) {
      const size = r1Size(teamCount);
      const shape = computeMainShape(teamCount, size);
      const layout = computeBackDrawLayout(shape);
      const target = layout.dropTargets.get(match.bracketSlot);
      if (target) {
        const backMatch = await Match.findOne({
          divisionId: match.divisionId,
          bracketSlot: target.backSlot,
          isConsolation: true,
        });
        if (backMatch) {
          if (target.position === 1) backMatch.team1Id = loserId;
          else backMatch.team2Id = loserId;
          await backMatch.save();
        }
      }
    }

    await settleBackDraw(match.divisionId, teamCount);
  } else if (!match.isGroupStage && division.format === "SINGLE_ELIM_CONSOLATION") {
    const teamCount = await Team.countDocuments({ divisionId: match.divisionId });
    await settleBackDraw(match.divisionId, teamCount);
  }

  if (match.isGroupStage) {
    revalidatePath(`/admin/t/${tournamentSlug}/d/${divisionId}/groups`);
  } else {
    revalidatePath(`/admin/t/${tournamentSlug}/d/${divisionId}/bracket`);
  }
  return {};
}
