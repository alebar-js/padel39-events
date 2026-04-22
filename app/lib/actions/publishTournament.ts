"use server";

import { redirect } from "next/navigation";
import { connectDB } from "../db";
import { Tournament } from "../models/Tournament";
import type { TournamentStatus } from "../models/Tournament";

export async function publishTournament(formData: FormData): Promise<void> {
  const tournamentId = formData.get("tournamentId") as string;
  const status = (formData.get("status") as TournamentStatus) ?? "DRAFT";

  await connectDB();
  const t = await Tournament.findByIdAndUpdate(tournamentId, { status }, { new: true });
  if (!t) return;

  redirect(`/admin`);
}
