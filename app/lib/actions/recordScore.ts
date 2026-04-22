"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Match, type MatchSet } from "../models/Match";
import { Division } from "../models/Division";
import { Team } from "../models/Team";
import { computeMainShape, computeBackDrawLayout, isFirstMainMatchForTeam } from "./backDraw";
import mongoose from "mongoose";

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function r1Size(n: number): number {
  if (n <= 2) return 1;
  return nextPow2(Math.ceil(n / 2));
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

  // Filter sets: ignore ones with both values 0/empty
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

  // Propagate winner to parent match (only for bracket matches).
  // Stay within the same bracket side — main winners feed main parents,
  // back-draw winners feed back-draw parents.
  if (!match.isGroupStage && match.bracketSlot) {
    const parentSlot = Math.floor(match.bracketSlot / 2);
    if (parentSlot >= 1) {
      const parentMatch = await Match.findOne({
        divisionId: match.divisionId,
        bracketSlot: parentSlot,
        isConsolation: match.isConsolation,
      });
      if (parentMatch) {
        // Even slot -> team1 of parent, odd slot -> team2 of parent
        const slotIsEven = match.bracketSlot % 2 === 0;
        if (slotIsEven) parentMatch.team1Id = winnerId ?? undefined;
        else parentMatch.team2Id = winnerId ?? undefined;
        await parentMatch.save();
      }
    }
  }

  // Route loser into the back draw (main-bracket matches only, SINGLE_ELIM_CONSOLATION).
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
    if (wasFirstMatch) {
      const teams = await Team.find({ divisionId: match.divisionId }).sort({ seed: 1 }).lean();
      const size = r1Size(teams.length);
      const shape = computeMainShape(teams.length, size);
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
  }

  // Revalidate appropriate path
  if (match.isGroupStage) {
    revalidatePath(`/admin/t/${tournamentSlug}/d/${divisionId}/groups`);
  } else {
    revalidatePath(`/admin/t/${tournamentSlug}/d/${divisionId}/bracket`);
  }
  return {};
}
