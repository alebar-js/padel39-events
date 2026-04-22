"use server";

import { connectDB } from "../db";
import { Division } from "../models/Division";
import { Team } from "../models/Team";
import { Group } from "../models/Group";
import { Match } from "../models/Match";
import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

interface GroupStanding {
  groupId: string;
  groupName: string;
  teams: {
    teamId: string;
    teamName: string;
    wins: number;
    losses: number;
    points: number; // For future tie-breaker implementation
    position: number;
  }[];
}

export async function getGroupStandings(divisionId: string): Promise<{ error?: string; standings?: GroupStanding[] }> {
  await connectDB();
  const divOid = new mongoose.Types.ObjectId(divisionId);

  const [division, groups, teams, matches] = await Promise.all([
    Division.findById(divOid).lean(),
    Group.find({ divisionId: divOid }).sort({ order: 1 }).lean(),
    Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean(),
    Match.find({ divisionId: divOid, isGroupStage: true }).lean(),
  ]);

  if (!division || division.format !== "GROUP_PLAYOFF") {
    return { error: "Division must be GROUP_PLAYOFF format" };
  }

  const matchFormat = division.matchFormat ?? "BEST_OF_3";
  const standings: GroupStanding[] = [];

  for (const group of groups) {
    const groupTeams = teams.filter(t => t.groupId?.toString() === group._id.toString());
    const groupMatches = matches.filter(m => m.groupId?.toString() === group._id.toString());

    // Calculate standings
    const teamStats = groupTeams.map(team => {
      const teamMatches = groupMatches.filter(m => 
        (m.team1Id?.toString() === team._id.toString() || m.team2Id?.toString() === team._id.toString()) &&
        m.winnerId
      );

      const wins = teamMatches.filter(m => m.winnerId?.toString() === team._id.toString()).length;
      const losses = teamMatches.filter(m => 
        (m.team1Id?.toString() === team._id.toString() || m.team2Id?.toString() === team._id.toString()) &&
        m.winnerId?.toString() !== team._id.toString()
      ).length;

      // Calculate games differential, with different logic for best-of-1 vs best-of-3
      let setsFor = 0;
      let setsAgainst = 0;
      
      for (const match of teamMatches) {
        for (const set of match.sets || []) {
          let isSuperTieBreak = false;
          
          if (matchFormat === "BEST_OF_3") {
            // In best-of-3: third set > 7 = super tie-breaker (exclude from Games +/-)
            isSuperTieBreak = set.team1 > 7 || set.team2 > 7;
          }
          // In best-of-1: single set can go to 8+ (super set) - always include in Games +/-
          
          if (!isSuperTieBreak) {
            if (match.team1Id?.toString() === team._id.toString()) {
              setsFor += set.team1;
              setsAgainst += set.team2;
            } else {
              setsFor += set.team2;
              setsAgainst += set.team1;
            }
          }
        }
      }

      return {
        teamId: team._id.toString(),
        teamName: `${team.player1} / ${team.player2}`,
        wins,
        losses,
        points: wins, // Simple: 1 point per win (can be enhanced later)
        setsFor,
        setsAgainst,
        position: 0, // Will be set after sorting
      };
    });

    // Sort by wins (descending), then by sets differential, then by seed as tie-breaker
    teamStats.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      
      const aDiff = (a.setsFor || 0) - (a.setsAgainst || 0);
      const bDiff = (b.setsFor || 0) - (b.setsAgainst || 0);
      if (bDiff !== aDiff) return bDiff - aDiff;
      
      const teamA = groupTeams.find(t => t._id.toString() === a.teamId);
      const teamB = groupTeams.find(t => t._id.toString() === b.teamId);
      return (teamA?.seed ?? 999) - (teamB?.seed ?? 999);
    });

    // Assign positions
    teamStats.forEach((stat, index) => {
      stat.position = index + 1;
    });

    standings.push({
      groupId: group._id.toString(),
      groupName: group.name,
      teams: teamStats,
    });
  }

  return { standings };
}

export async function isGroupStageComplete(divisionId: string): Promise<{ error?: string; complete?: boolean; incompleteMatches?: any[] }> {
  await connectDB();
  const divOid = new mongoose.Types.ObjectId(divisionId);

  const [division, matches] = await Promise.all([
    Division.findById(divOid).lean(),
    Match.find({ divisionId: divOid, isGroupStage: true }).lean(),
  ]);

  if (!division || division.format !== "GROUP_PLAYOFF") {
    return { error: "Division must be GROUP_PLAYOFF format" };
  }

  const incompleteMatches = matches.filter(m => !m.winnerId);

  return {
    complete: incompleteMatches.length === 0,
    incompleteMatches: incompleteMatches.map(m => ({
      id: m._id,
      groupId: m.groupId,
      round: m.round,
    })),
  };
}

export async function generatePlayoffBracket(divisionId: string, tournamentSlug: string): Promise<{ error?: string }> {
  await connectDB();
  const divOid = new mongoose.Types.ObjectId(divisionId);

  // Check division and state
  const division = await Division.findById(divOid).lean();
  if (!division || division.format !== "GROUP_PLAYOFF") {
    return { error: "Division must be GROUP_PLAYOFF format" };
  }

  if (division.groupPlayoffState !== "PLAYOFF_STAGE") {
    return { error: "Division must be in PLAYOFF_STAGE to generate bracket" };
  }

  // Get qualified teams
  const { standings, error: standingsError } = await getGroupStandings(divisionId);
  if (standingsError || !standings) {
    return { error: standingsError || "Failed to get group standings" };
  }

  const playoffSize = division.groupPlayoffConfig?.playoffSize ?? 4;
  const qualifyingMode = division.groupPlayoffConfig?.qualifyingMode ?? "AUTO";

  // Collect qualified teams
  const qualifiedTeams: any[] = [];
  
  if (qualifyingMode === "AUTO") {
    // Take top teams from each group, plus best runners-up if needed
    const teamsPerGroup = Math.floor(playoffSize / standings.length);
    const remainingSlots = playoffSize % standings.length;

    for (const standing of standings) {
      // Take top teams from this group
      for (let i = 0; i < Math.min(teamsPerGroup, standing.teams.length); i++) {
        qualifiedTeams.push({
          teamId: standing.teams[i].teamId,
          seed: qualifiedTeams.length + 1,
          source: `${standing.groupName}${standing.teams[i].position}`,
        });
      }
    }

    // Fill remaining slots with best runners-up
    if (remainingSlots > 0) {
      const runnersUp = standings
        .map(s => s.teams[1]) // Second place teams
        .filter(t => t)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, remainingSlots);

      for (const runnerUp of runnersUp) {
        qualifiedTeams.push({
          teamId: runnerUp.teamId,
          seed: qualifiedTeams.length + 1,
          source: "Runner-up",
        });
      }
    }
  }

  if (qualifiedTeams.length !== playoffSize) {
    return { error: `Expected ${playoffSize} qualified teams, got ${qualifiedTeams.length}` };
  }

  // Clear existing playoff matches
  await Match.deleteMany({
    divisionId: divOid,
    isGroupStage: false,
    phase: "PLAYOFF",
  });

  // Generate bracket using existing generateBracket logic but with qualified teams only
  const bracketResult = await generateBracketFromTeams(qualifiedTeams, divOid);
  if (bracketResult.error) {
    return bracketResult;
  }

  revalidatePath(`/admin/t/${tournamentSlug}/d/${divisionId}/bracket`);
  return {};
}

// Helper function to generate bracket from specific teams
async function generateBracketFromTeams(qualifiedTeams: any[], divisionId: mongoose.Types.ObjectId): Promise<{ error?: string }> {
  const teamCount = qualifiedTeams.length;
  const size = Math.pow(2, Math.ceil(Math.log2(teamCount)));
  const byes = size - teamCount;

  // Create bracket slots using standard single-elimination logic
  const docs: any[] = [];
  
  // Standard bracket seeding order
  function seedOrder(size: number): number[] {
    let order = [1];
    while (order.length < size) {
      const next: number[] = [];
      const totalSeeds = order.length * 2;
      for (const s of order) {
        next.push(s);
        next.push(totalSeeds + 1 - s);
      }
      order = next;
    }
    return order;
  }

  const order = seedOrder(size);
  const slotTeams: Record<number, { team1Id?: mongoose.Types.ObjectId; team2Id?: mongoose.Types.ObjectId }> = {};
  const liveR1: { slot: number; team1Id?: mongoose.Types.ObjectId; team2Id?: mongoose.Types.ObjectId }[] = [];

  // Assign teams to R1 slots with byes
  for (let i = 0; i < size; i++) {
    const highSeed = order[i];
    const lowSeed = 2 * size + 1 - highSeed;
    const highTeam = highSeed <= teamCount ? qualifiedTeams[highSeed - 1] : null;
    const lowTeam = lowSeed <= teamCount ? qualifiedTeams[lowSeed - 1] : null;
    const r1Slot = size + i;

    if (highTeam && lowTeam) {
      // Full R1 match
      liveR1.push({
        slot: r1Slot,
        team1Id: new mongoose.Types.ObjectId(highTeam.teamId),
        team2Id: new mongoose.Types.ObjectId(lowTeam.teamId),
      });
    } else if (highTeam && !lowTeam) {
      // High seed gets a bye - advance into R2 parent
      const r2Slot = Math.floor(r1Slot / 2);
      const isEven = r1Slot % 2 === 0;
      if (!slotTeams[r2Slot]) slotTeams[r2Slot] = {};
      if (isEven) {
        slotTeams[r2Slot].team1Id = new mongoose.Types.ObjectId(highTeam.teamId);
      } else {
        slotTeams[r2Slot].team2Id = new mongoose.Types.ObjectId(highTeam.teamId);
      }
    }
  }

  // Determine live slots for upper rounds
  const liveSlots = new Set<number>();
  for (const { slot } of liveR1) {
    let s = Math.floor(slot / 2);
    while (s >= 1) {
      liveSlots.add(s);
      s = Math.floor(s / 2);
    }
  }
  for (const slotStr of Object.keys(slotTeams)) {
    const slot = Number(slotStr);
    let s = slot;
    while (s >= 1) {
      liveSlots.add(s);
      s = Math.floor(s / 2);
    }
  }

  // Round names
  function roundName(slot: number, size: number): string {
    const depth = Math.floor(Math.log2(slot));
    const totalRounds = Math.log2(size) + 1;
    if (depth === 0) return "Final";
    if (depth === 1) return "SF";
    if (depth === 2) return "QF";
    if (depth === totalRounds - 1) return "R1";
    if (depth === 3) return "R16";
    return `R${1 << depth}`;
  }

  // Upper round slots (only live ones)
  for (const slot of Array.from(liveSlots).sort((a, b) => a - b)) {
    docs.push({
      divisionId,
      round: roundName(slot, size),
      bracketSlot: slot,
      team1Id: slotTeams[slot]?.team1Id ?? undefined,
      team2Id: slotTeams[slot]?.team2Id ?? undefined,
      phase: "PLAYOFF",
      isGroupStage: false,
      isConsolation: false,
      sets: [],
    });
  }

  // R1 matches (only live ones)
  for (const { slot, team1Id, team2Id } of liveR1) {
    docs.push({
      divisionId,
      round: "R1",
      bracketSlot: slot,
      team1Id,
      team2Id,
      phase: "PLAYOFF",
      isGroupStage: false,
      isConsolation: false,
      sets: [],
    });
  }

  if (docs.length > 0) {
    await Match.insertMany(docs);
  }

  return {};
}

export async function advanceToPlayoffs(divisionId: string, tournamentSlug: string): Promise<{ error?: string }> {
  await connectDB();
  const divOid = new mongoose.Types.ObjectId(divisionId);

  // Check if group stage is complete
  const { complete, incompleteMatches, error } = await isGroupStageComplete(divisionId);
  if (error) return { error };
  if (!complete) {
    return { 
      error: `Group stage is not complete. ${incompleteMatches?.length ?? 0} matches remaining.` 
    };
  }

  // Update division state
  await Division.findByIdAndUpdate(divOid, {
    groupPlayoffState: "PLAYOFF_STAGE",
  });

  revalidatePath(`/admin/t/${tournamentSlug}`);
  return {};
}
