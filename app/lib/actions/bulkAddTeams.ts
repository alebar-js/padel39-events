"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Team } from "../models/Team";
import mongoose from "mongoose";

export type BulkAddTeamsState = { error?: string; added?: number } | null;

function parseLines(raw: string): { player1: string; player2: string }[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split(/[,&\/\t]+/).map((s) => s.trim()).filter(Boolean);
      return parts.length >= 2 ? { player1: parts[0], player2: parts[1] } : null;
    })
    .filter((t): t is { player1: string; player2: string } => t !== null);
}

export async function bulkAddTeams(
  _prev: BulkAddTeamsState,
  formData: FormData
): Promise<BulkAddTeamsState> {
  const divisionId = formData.get("divisionId") as string;
  const tournamentSlug = formData.get("tournamentSlug") as string;
  const raw = (formData.get("teams") as string) ?? "";

  const pairs = parseLines(raw);
  if (pairs.length === 0) return { error: 'No valid pairs found. Use "Player 1, Player 2" format.' };

  await connectDB();
  const divId = new mongoose.Types.ObjectId(divisionId);
  const existing = await Team.countDocuments({ divisionId: divId });

  await Team.insertMany(
    pairs.map((p, i) => ({ divisionId: divId, player1: p.player1, player2: p.player2, seed: existing + i + 1 }))
  );

  revalidatePath(`/admin/t/${tournamentSlug}`);
  return { added: pairs.length };
}
