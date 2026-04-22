"use server";

import mongoose from "mongoose";
import { connectDB } from "../db";
import { TournamentDay } from "../models/TournamentDay";

export interface UpdateDayScheduleData {
  dayId: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

export async function updateDaySchedule(data: UpdateDayScheduleData): Promise<{ error?: string }> {
  await connectDB();
  
  try {
    const { dayId, startTime, endTime, slotMinutes } = data;
    
    // Validate time format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return { error: "Invalid time format. Use HH:MM format." };
    }
    
    // Validate slot minutes
    if (slotMinutes < 15 || slotMinutes > 240) {
      return { error: "Time slot must be between 15 and 240 minutes." };
    }
    
    // Validate that start time is before end time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes >= endMinutes) {
      return { error: "Start time must be before end time." };
    }
    
    // Update the tournament day
    await TournamentDay.findByIdAndUpdate(
      dayId,
      {
        startTime,
        endTime,
        slotMinutes,
      },
      { new: true }
    );
    
    return {};
  } catch (error) {
    console.error("Error updating day schedule:", error);
    return { error: "Failed to update day schedule." };
  }
}
