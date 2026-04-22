"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Court } from "../models/Court";
import { Match } from "../models/Match";

export async function addCourt(tournamentId: string, tournamentSlug: string): Promise<{ error?: string }> {
  try {
    await connectDB();
    const tId = new mongoose.Types.ObjectId(tournamentId);

    // Get the highest order number for this tournament
    const lastCourt = await Court.findOne({ tournamentId: tId }).sort({ order: -1 }).lean();
    const nextOrder = (lastCourt?.order ?? 0) + 1;

    await Court.create({
      tournamentId: tId,
      name: `Court ${nextOrder}`,
      order: nextOrder,
    });

    revalidatePath(`/admin/t/${tournamentSlug}/schedule`);
    return {};
  } catch (error) {
    console.error('Error in addCourt:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function removeCourt(courtId: string, tournamentSlug: string): Promise<{ error?: string }> {
  try {
    await connectDB();
    const cId = new mongoose.Types.ObjectId(courtId);

    // Check if any matches are scheduled on this court
    const scheduledMatches = await Match.countDocuments({ courtId: cId });
    if (scheduledMatches > 0) {
      return { error: "Cannot remove court with scheduled matches. Please reschedule or remove the matches first." };
    }

    await Court.findByIdAndDelete(cId);
    revalidatePath(`/admin/t/${tournamentSlug}/schedule`);
    return {};
  } catch (error) {
    console.error('Error in removeCourt:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function updateCourtName(courtId: string, name: string, tournamentSlug: string): Promise<{ error?: string }> {
  try {
    await connectDB();
    const cId = new mongoose.Types.ObjectId(courtId);

    await Court.findByIdAndUpdate(cId, { name });
    revalidatePath(`/admin/t/${tournamentSlug}/schedule`);
    return {};
  } catch (error) {
    console.error('Error in updateCourtName:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}
