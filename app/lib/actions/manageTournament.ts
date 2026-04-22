"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { connectDB } from "../db";
import { Tournament, type TournamentStatus } from "../models/Tournament";
import {
  Division,
  type DivisionFormat,
  type IGroupPlayoffConfig,
  type MatchFormat,
  type PlayoffQualifyingMode,
} from "../models/Division";
import { Team } from "../models/Team";
import { Match } from "../models/Match";

type UpdateTournamentInput = {
  name: string;
  slug: string;
  venue?: string;
  startDate: string; // ISO (yyyy-mm-dd or full ISO)
  endDate: string;
  status: TournamentStatus;
};

export async function updateTournamentInfo(
  tournamentId: string,
  input: UpdateTournamentInput,
  currentSlug: string
): Promise<{ error?: string; slug?: string }> {
  try {
    await connectDB();
    const tId = new mongoose.Types.ObjectId(tournamentId);

    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();
    const venue = input.venue?.trim() ?? "";

    if (!name) return { error: "Name is required." };
    if (!slug) return { error: "Slug is required." };
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { error: "Slug can only contain lowercase letters, numbers, and dashes." };
    }

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { error: "Invalid dates." };
    }
    if (end < start) return { error: "End date must be on or after start date." };

    if (slug !== currentSlug) {
      const existing = await Tournament.findOne({ slug }).lean();
      if (existing && existing._id.toString() !== tournamentId) {
        return { error: "That slug is already in use." };
      }
    }

    await Tournament.findByIdAndUpdate(tId, {
      name,
      slug,
      venue: venue || undefined,
      startDate: start,
      endDate: end,
      status: input.status,
    });

    revalidatePath(`/admin/t/${currentSlug}`);
    if (slug !== currentSlug) revalidatePath(`/admin/t/${slug}`);
    revalidatePath("/admin");

    return { slug };
  } catch (error) {
    console.error("Error in updateTournamentInfo:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

export async function addDivision(
  tournamentId: string,
  tournamentSlug: string
): Promise<{ error?: string }> {
  try {
    await connectDB();
    const tId = new mongoose.Types.ObjectId(tournamentId);

    const count = await Division.countDocuments({ tournamentId: tId });
    await Division.create({
      tournamentId: tId,
      name: `Division ${count + 1}`,
      format: "SINGLE_ELIM_CONSOLATION" as DivisionFormat,
      matchFormat: "BEST_OF_3" as MatchFormat,
    });

    revalidatePath(`/admin/t/${tournamentSlug}`);
    return {};
  } catch (error) {
    console.error("Error in addDivision:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

type UpdateDivisionInput = {
  name: string;
  format: DivisionFormat;
  matchFormat: MatchFormat;
  groupPlayoffConfig?: IGroupPlayoffConfig;
};

function validateGroupPlayoffConfig(
  cfg: IGroupPlayoffConfig | undefined
): { error?: string; value?: IGroupPlayoffConfig } {
  if (!cfg) return { error: "Group + playoff settings are required for this format." };
  const groupSize = Number(cfg.groupSize);
  const playoffSize = Number(cfg.playoffSize);
  if (!Number.isInteger(groupSize) || groupSize < 2) {
    return { error: "Group size must be an integer of 2 or more." };
  }
  if (!Number.isInteger(playoffSize) || playoffSize < 2) {
    return { error: "Playoff size must be an integer of 2 or more." };
  }
  if ((playoffSize & (playoffSize - 1)) !== 0) {
    return { error: "Playoff size must be a power of 2 (2, 4, 8, 16…)." };
  }
  const qualifyingMode: PlayoffQualifyingMode =
    cfg.qualifyingMode === "AUTO" ? "AUTO" : cfg.qualifyingMode === "MANUAL" ? "MANUAL" : "MANUAL";
  if (cfg.qualifyingMode !== "AUTO" && cfg.qualifyingMode !== "MANUAL") {
    return { error: "Qualifying mode must be MANUAL or AUTO." };
  }
  return { value: { groupSize, playoffSize, qualifyingMode } };
}

export async function updateDivision(
  divisionId: string,
  input: UpdateDivisionInput,
  tournamentSlug: string
): Promise<{ error?: string }> {
  try {
    await connectDB();
    const dId = new mongoose.Types.ObjectId(divisionId);

    const name = input.name.trim();
    if (!name) return { error: "Division name is required." };

    const current = await Division.findById(dId).lean();
    if (!current) return { error: "Division not found." };

    if (input.format !== current.format) {
      const matchCount = await Match.countDocuments({ divisionId: dId });
      if (matchCount > 0) {
        return {
          error:
            "Cannot change format after the bracket has been generated. Remove matches first.",
        };
      }
    }

    const update: Record<string, unknown> = {
      name,
      format: input.format,
      matchFormat: input.matchFormat,
    };

    if (input.format === "GROUP_PLAYOFF") {
      const { error, value } = validateGroupPlayoffConfig(input.groupPlayoffConfig);
      if (error) return { error };
      update.groupPlayoffConfig = value;
    } else {
      update.$unset = { groupPlayoffConfig: 1 };
    }

    await Division.findByIdAndUpdate(dId, update);

    revalidatePath(`/admin/t/${tournamentSlug}`);
    return {};
  } catch (error) {
    console.error("Error in updateDivision:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

export async function removeDivision(
  divisionId: string,
  tournamentSlug: string
): Promise<{ error?: string }> {
  try {
    await connectDB();
    const dId = new mongoose.Types.ObjectId(divisionId);

    const teamCount = await Team.countDocuments({ divisionId: dId });
    if (teamCount > 0) {
      return { error: "Cannot remove a division with teams. Remove the teams first." };
    }
    const matchCount = await Match.countDocuments({ divisionId: dId });
    if (matchCount > 0) {
      return { error: "Cannot remove a division with matches. Remove the matches first." };
    }

    await Division.findByIdAndDelete(dId);
    revalidatePath(`/admin/t/${tournamentSlug}`);
    return {};
  } catch (error) {
    console.error("Error in removeDivision:", error);
    return { error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
