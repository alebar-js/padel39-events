"use server";

import { redirect } from "next/navigation";
import { connectDB } from "../db";
import { Division } from "../models/Division";
import mongoose from "mongoose";

export type SaveDivisionsState = { error?: string } | null;

export async function saveDivisions(
  _prev: SaveDivisionsState,
  formData: FormData
): Promise<SaveDivisionsState> {
  const tournamentId = formData.get("tournamentId") as string;
  if (!tournamentId) return { error: "Missing tournament ID." };

  const names = formData.getAll("name") as string[];
  const formats = formData.getAll("format") as string[];
  const matchFormats = formData.getAll("matchFormat") as string[];

  const pairs = names
    .map((n, i) => ({
      name: n.trim(),
      format: formats[i],
      matchFormat: matchFormats[i] === "ONE_SET" ? "ONE_SET" : "BEST_OF_3",
    }))
    .filter((p) => p.name && (p.format === "SINGLE_ELIM_CONSOLATION" || p.format === "GROUP_PLAYOFF"));

  if (pairs.length === 0) return { error: "Add at least one division." };

  await connectDB();
  const tid = new mongoose.Types.ObjectId(tournamentId);

  // Replace existing divisions for this tournament
  await Division.deleteMany({ tournamentId: tid });
  await Division.insertMany(
    pairs.map((p) => ({
      tournamentId: tid,
      name: p.name,
      format: p.format,
      matchFormat: p.matchFormat,
    }))
  );

  redirect(`/admin/new/${tournamentId}/teams`);
}
