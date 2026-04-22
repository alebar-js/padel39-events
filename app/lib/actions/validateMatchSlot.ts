"use server";

import mongoose from "mongoose";
import { connectDB } from "../db";
import { Match } from "../models/Match";
import { Court } from "../models/Court";

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
    })
      .populate<{ team1Id: { player1: string; player2: string } | null }>("team1Id", "player1 player2")
      .populate<{ team2Id: { player1: string; player2: string } | null }>("team2Id", "player1 player2")
      .lean();

    if (teamConflict) {
      const conflictingIds = new Set(teamIds.map((id) => id.toString()));
      // Figure out which team is shared
      const t1 = teamConflict.team1Id as { player1: string; player2: string } | null;
      const t2 = teamConflict.team2Id as { player1: string; player2: string } | null;
      const sharedTeam =
        t1 && conflictingIds.has((teamConflict as unknown as { team1Id: { _id: mongoose.Types.ObjectId } }).team1Id?._id?.toString() ?? "")
          ? `${t1.player1} / ${t1.player2}`
          : t2
          ? `${t2.player1} / ${t2.player2}`
          : "A pair";
      errors.push(`${sharedTeam} is already playing another match at ${fmtTime(when)}.`);
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
