"use server";

import mongoose from "mongoose";
import { connectDB } from "../db";
import { Tournament } from "../models/Tournament";
import { Court } from "../models/Court";
import { TournamentDay } from "../models/TournamentDay";

const DEFAULT_COURT_COUNT = 6;
const DEFAULT_START_TIME = "09:00";
const DEFAULT_END_TIME = "22:00";
const DEFAULT_SLOT_MINUTES = 90;

function startOfUTCDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function eachUTCDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = startOfUTCDay(start);
  const last = startOfUTCDay(end);
  while (cursor.getTime() <= last.getTime()) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export async function ensureTournamentSchedule(tournamentId: string): Promise<void> {
  await connectDB();
  const tId = new mongoose.Types.ObjectId(tournamentId);

  const tournament = await Tournament.findById(tId).lean();
  if (!tournament) throw new Error(`Tournament ${tournamentId} not found`);

  const courtCount = await Court.countDocuments({ tournamentId: tId });
  if (courtCount === 0) {
    const docs = Array.from({ length: DEFAULT_COURT_COUNT }, (_, i) => ({
      tournamentId: tId,
      name: `Court ${i + 1}`,
      order: i + 1,
    }));
    await Court.insertMany(docs);
  }

  const days = eachUTCDay(tournament.startDate, tournament.endDate);
  if (days.length === 0) return;

  await TournamentDay.bulkWrite(
    days.map((date) => ({
      updateOne: {
        filter: { tournamentId: tId, date },
        update: {
          $setOnInsert: {
            tournamentId: tId,
            date,
            startTime: DEFAULT_START_TIME,
            endTime: DEFAULT_END_TIME,
            slotMinutes: DEFAULT_SLOT_MINUTES,
          },
        },
        upsert: true,
      },
    }))
  );
}
