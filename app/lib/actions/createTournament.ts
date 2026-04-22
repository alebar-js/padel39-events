"use server";

import { redirect } from "next/navigation";
import { connectDB } from "../db";
import { Tournament } from "../models/Tournament";

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export type CreateTournamentState = { error?: string } | null;

export async function createTournament(
  _prev: CreateTournamentState,
  formData: FormData
): Promise<CreateTournamentState> {
  const name = (formData.get("name") as string)?.trim();
  const venue = (formData.get("venue") as string)?.trim() || undefined;
  const startRaw = formData.get("startDate") as string;
  const endRaw = formData.get("endDate") as string;

  if (!name) return { error: "Tournament name is required." };
  if (!startRaw || !endRaw) return { error: "Start and end dates are required." };

  const startDate = new Date(startRaw);
  const endDate = new Date(endRaw);
  if (endDate < startDate) return { error: "End date must be on or after start date." };

  let slug = toSlug(name);

  await connectDB();

  const exists = await Tournament.exists({ slug });
  if (exists) slug = `${slug}-${randomSuffix()}`;

  const tournament = await Tournament.create({
    name,
    slug,
    venue,
    startDate,
    endDate,
    status: "DRAFT",
    createdByUserId: "dev",
  });

  redirect(`/admin/new/${tournament._id}/divisions`);
}
