"use server";

import mongoose from "mongoose";
import { connectDB } from "../db";
import { Match } from "../models/Match";
import { Court } from "../models/Court";
import { Team } from "../models/Team";

function fmtTime(d: Date): string {
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

export async function validateMatchSlot(
  matchId: string,
  courtId: string,
  scheduledTime: string
): Promise<{ errors: string[] }> {
  await connectDB();

  const mId = new mongoose.Types.ObjectId(matchId);
  const cId = new mongoose.Types.ObjectId(courtId);
  const when = new Date(scheduledTime);

  const match = await Match.findById(mId).lean();
  if (!match) return { errors: ["Match not found."] };

  const errors: string[] = [];

  // 1. Court collision
  const courtConflict = await Match.findOne({
    _id: { $ne: mId },
    courtId: cId,
    scheduledTime: when,
  }).lean();
  if (courtConflict) {
    const court = await Court.findById(cId).lean();
    errors.push(`${court?.name ?? "That court"} is already taken at ${fmtTime(when)}.`);
  }

  // 2. Pair double-booking
  const teamIds = [match.team1Id, match.team2Id].filter(Boolean) as mongoose.Types.ObjectId[];
  if (teamIds.length > 0) {
    const teamConflict = await Match.findOne({
      _id: { $ne: mId },
      scheduledTime: when,
      $or: [
        { team1Id: { $in: teamIds } },
        { team2Id: { $in: teamIds } },
      ],
    }).lean();

    if (teamConflict) {
      const conflictingIds = new Set(teamIds.map((id) => id.toString()));
      const sharedTeamId = [teamConflict.team1Id, teamConflict.team2Id]
        .find((id) => id && conflictingIds.has(id.toString()));
      const team = sharedTeamId ? await Team.findById(sharedTeamId).lean() : null;
      const label = team ? `${team.player1} / ${team.player2}` : "A pair";
      errors.push(`${label} is already playing another match at ${fmtTime(when)}.`);
    }
  }

  // 3. Bracket precedence
  if (match.bracketSlot != null && match.bracketSlot >= 2) {
    const feederSlots = [match.bracketSlot * 2, match.bracketSlot * 2 + 1];
    const feeders = await Match.find({
      divisionId: match.divisionId,
      isConsolation: match.isConsolation,
      bracketSlot: { $in: feederSlots },
    }).lean();

    for (const feeder of feeders) {
      if (!feeder.scheduledTime) {
        errors.push(
          `${feeder.round} (slot #${feeder.bracketSlot}) hasn't been scheduled yet — it must be placed before this match.`
        );
      } else if (feeder.scheduledTime >= when) {
        errors.push(
          `${feeder.round} (slot #${feeder.bracketSlot}) is at ${fmtTime(feeder.scheduledTime)}, which is not before this match.`
        );
      }
    }
  }

  return { errors };
}
