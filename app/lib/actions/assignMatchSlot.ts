"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Match } from "../models/Match";
import { validateMatchSlot } from "./validateMatchSlot";

export async function assignMatchSlot(
  matchId: string,
  courtId: string | null,
  scheduledTime: string | null,
  tournamentSlug: string
): Promise<{ error?: string }> {
  try {
    await connectDB();

    const mId = new mongoose.Types.ObjectId(matchId);

    if (courtId && scheduledTime) {
      const { errors } = await validateMatchSlot(matchId, courtId, scheduledTime);
      if (errors.length > 0) return { error: errors.join(" · ") };

      const cId = new mongoose.Types.ObjectId(courtId);
      const when = new Date(scheduledTime);
      await Match.findByIdAndUpdate(mId, { courtId: cId, scheduledTime: when });
    } else {
      await Match.findByIdAndUpdate(mId, { $unset: { courtId: 1, scheduledTime: 1 } });
    }

    revalidatePath(`/admin/t/${tournamentSlug}/schedule`);
    return {};
  } catch (error) {
    console.error("Error in assignMatchSlot:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
