"use server";

import { redirect } from "next/navigation";
import { connectDB } from "../db";
import { Team } from "../models/Team";
import mongoose from "mongoose";

export type SaveTeamsState = { error?: string } | null;

function parseTeamLines(raw: string): { player1: string; player2: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/[,&\/\t]+/).map((s) => s.trim()).filter(Boolean);
      return parts.length >= 2 ? { player1: parts[0], player2: parts[1] } : null;
    })
    .filter((t): t is { player1: string; player2: string } => t !== null);
}

export async function saveTeams(
  _prev: SaveTeamsState,
  formData: FormData
): Promise<SaveTeamsState> {
  const tournamentId = formData.get("tournamentId") as string;
  if (!tournamentId) return { error: "Missing tournament ID." };

  const divisionIds = formData.getAll("divisionId") as string[];
  const raws = formData.getAll("teams") as string[];

  await connectDB();

  for (let i = 0; i < divisionIds.length; i++) {
    const divId = new mongoose.Types.ObjectId(divisionIds[i]);
    const teams = parseTeamLines(raws[i] ?? "");
    await Team.deleteMany({ divisionId: divId });
    if (teams.length > 0) {
      await Team.insertMany(
        teams.map((t, idx) => ({ divisionId: divId, player1: t.player1, player2: t.player2, seed: idx + 1 }))
      );
    }
  }

  redirect(`/admin/new/${tournamentId}/review`);
}
