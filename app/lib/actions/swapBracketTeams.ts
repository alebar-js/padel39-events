"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { connectDB } from "../db";
import { Match, type IMatch } from "../models/Match";

type BracketPosition = 1 | 2;

type SwapBracketTeamsParams = {
  divisionId: string;
  tournamentSlug: string;
  isConsolation: boolean;
  sourceMatchId: string;
  sourcePosition: BracketPosition;
  targetMatchId: string;
  targetPosition: BracketPosition;
};

function getTeamId(match: mongoose.HydratedDocument<IMatch>, position: BracketPosition) {
  return position === 1 ? match.team1Id : match.team2Id;
}

function setTeamId(
  match: mongoose.HydratedDocument<IMatch>,
  position: BracketPosition,
  teamId?: mongoose.Types.ObjectId
) {
  if (position === 1) match.team1Id = teamId;
  else match.team2Id = teamId;
}

export async function swapBracketTeams({
  divisionId,
  tournamentSlug,
  isConsolation,
  sourceMatchId,
  sourcePosition,
  targetMatchId,
  targetPosition,
}: SwapBracketTeamsParams): Promise<{ error?: string }> {
  await connectDB();

  if (sourceMatchId === targetMatchId && sourcePosition === targetPosition) {
    return { error: "Choose two different bracket positions." };
  }

  const divOid = new mongoose.Types.ObjectId(divisionId);
  const [sourceMatch, targetMatch] = await Promise.all([
    Match.findOne({ _id: sourceMatchId, divisionId: divOid, isConsolation, bracketSlot: { $exists: true, $ne: null } }),
    Match.findOne({ _id: targetMatchId, divisionId: divOid, isConsolation, bracketSlot: { $exists: true, $ne: null } }),
  ]);

  if (!sourceMatch || !targetMatch) {
    return { error: "Could not find both bracket positions." };
  }

  const sourceTeamId = getTeamId(sourceMatch, sourcePosition);
  const targetTeamId = getTeamId(targetMatch, targetPosition);
  const involvedTeamIds = [sourceTeamId, targetTeamId]
    .filter((teamId): teamId is mongoose.Types.ObjectId => !!teamId)
    .map((teamId) => teamId.toString());

  if (involvedTeamIds.length === 0) {
    return { error: "Pick at least one occupied bracket position." };
  }

  const lockedMatch = await Match.findOne({
    divisionId: divOid,
    $and: [
      {
        $or: [
          { team1Id: { $in: involvedTeamIds } },
          { team2Id: { $in: involvedTeamIds } },
        ],
      },
      {
        $or: [{ winnerId: { $exists: true, $ne: null } }, { "sets.0": { $exists: true } }],
      },
    ],
  }).lean();

  if (lockedMatch) {
    return { error: "Can't swap teams after scores have been saved for either side involved." };
  }

  setTeamId(sourceMatch, sourcePosition, targetTeamId ?? undefined);
  setTeamId(targetMatch, targetPosition, sourceTeamId ?? undefined);

  if (sourceMatch.winnerId && involvedTeamIds.includes(sourceMatch.winnerId.toString())) {
    sourceMatch.winnerId = undefined;
  }
  if (targetMatch.winnerId && involvedTeamIds.includes(targetMatch.winnerId.toString())) {
    targetMatch.winnerId = undefined;
  }

  if (sourceMatch.id === targetMatch.id) {
    await sourceMatch.save();
  } else {
    await Promise.all([sourceMatch.save(), targetMatch.save()]);
  }

  revalidatePath(`/admin/t/${tournamentSlug}/d/${divisionId}/bracket`);
  return {};
}
