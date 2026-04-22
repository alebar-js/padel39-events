"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Team } from "../models/Team";
import mongoose from "mongoose";

export type AddTeamState = { error?: string } | null;

export async function addTeam(
  _prev: AddTeamState,
  formData: FormData
): Promise<AddTeamState> {
  const divisionId = formData.get("divisionId") as string;
  const tournamentSlug = formData.get("tournamentSlug") as string;
  const player1 = (formData.get("player1") as string)?.trim();
  const player2 = (formData.get("player2") as string)?.trim();

  if (!player1 || !player2) return { error: "Both player names are required." };

  await connectDB();
  const divId = new mongoose.Types.ObjectId(divisionId);
  const count = await Team.countDocuments({ divisionId: divId });
  await Team.create({ divisionId: divId, player1, player2, seed: count + 1 });

  revalidatePath(`/admin/t/${tournamentSlug}`);
  return null;
}

export async function deleteTeam(teamId: string, tournamentSlug: string): Promise<void> {
  await connectDB();
  await Team.findByIdAndDelete(teamId);
  revalidatePath(`/admin/t/${tournamentSlug}`);
}

export async function reorderTeams(
  orderedIds: string[],
  tournamentSlug: string
): Promise<void> {
  await connectDB();
  await Promise.all(
    orderedIds.map((id, idx) =>
      Team.findByIdAndUpdate(id, { seed: idx + 1 })
    )
  );
  revalidatePath(`/admin/t/${tournamentSlug}`);
}
