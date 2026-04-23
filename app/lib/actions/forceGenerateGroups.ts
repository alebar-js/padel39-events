"use server";

import { connectDB } from "../db";
import { Division } from "../models/Division";
import { Team } from "../models/Team";
import { Group } from "../models/Group";
import { Match } from "../models/Match";
import { Tournament } from "../models/Tournament";
import mongoose from "mongoose";
import { redirect } from "next/navigation";

export async function forceGenerateGroups(divisionId: string, tournamentSlug: string) {
  await connectDB();

  // Find the tournament to verify it exists
  const tournament = await Tournament.findOne({ slug: tournamentSlug }).lean();
  if (!tournament) {
    throw new Error("Tournament not found");
  }

  const divOid = new mongoose.Types.ObjectId(divisionId);
  
  // Get division
  const division = await Division.findById(divOid).lean();
  if (!division) {
    throw new Error("Division not found");
  }
  
  if (division.format !== "GROUP_PLAYOFF") {
    throw new Error("Division must be GROUP_PLAYOFF format");
  }

  console.log(`Force generating groups for division: ${division.name}`);

  // Clean up everything FIRST (full reset — delete all matches for this division)
  console.log("Cleaning up existing data...");
  await Promise.all([
    Group.deleteMany({ divisionId: divOid }),
    Match.deleteMany({ divisionId: divOid }),
    Team.updateMany({ divisionId: divOid }, { $unset: { groupId: 1 } }),
  ]);

  // NOW get teams (fresh data after cleanup)
  const teams = await Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean();
  console.log(`Found ${teams.length} teams after cleanup`);
  
  // Verify reset worked
  const teamsWithGroupIds = teams.filter(t => t.groupId);
  console.log(`Teams with groupIds after reset: ${teamsWithGroupIds.length}`);
  if (teamsWithGroupIds.length > 0) {
    console.log("ERROR: Reset didn't work, teams still have groupIds");
  }
  
  const groupSize = division.groupPlayoffConfig?.groupSize ?? 4;
  if (teams.length < groupSize) {
    throw new Error(`Need at least ${groupSize} teams to create groups`);
  }

  // Create groups
  const numGroups = Math.ceil(teams.length / groupSize);
  console.log(`Creating ${numGroups} groups...`);
  
  const groups: any[] = [];
  for (let i = 0; i < numGroups; i++) {
    groups.push({
      divisionId: divOid,
      name: String.fromCharCode(65 + i), // A, B, C, ...
      order: i,
    });
  }
  
  const createdGroups = await Group.insertMany(groups);
  console.log("Created groups:", createdGroups.map(g => ({ name: g.name, id: g._id.toString() })));

  // Assign teams to groups
  console.log("Assigning teams to groups...");
  for (let i = 0; i < teams.length; i++) {
    const groupIndex = i % numGroups;
    const groupId = createdGroups[groupIndex]._id;
    const teamId = teams[i]._id;

    console.log(
      `  ${teams[i].player1} / ${teams[i].player2} -> Group ${createdGroups[groupIndex].name} (${groupId.toString()})`
    );

    await Team.findByIdAndUpdate(teamId, { groupId });
  }

  const updatedTeams = await Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean();
  console.log(`Assigned ${updatedTeams.filter(t => t.groupId).length} teams to groups`);
  
  // Check group matching
  console.log("Group matching verification:");
  for (const group of createdGroups) {
    const matchingTeams = updatedTeams.filter(t => t.groupId?.toString() === group._id.toString());
    console.log(`  Group ${group.name} (${group._id.toString()}): ${matchingTeams.length} teams`);
  }
  
  // Create matches
  console.log("Creating matches...");
  const matches: any[] = [];
  
  for (const group of createdGroups) {
    const groupTeams = updatedTeams.filter((t) => 
      t.groupId?.toString() === group._id.toString()
    );
    
    console.log(`Group ${group.name}: ${groupTeams.length} teams`);
    
    // Generate round-robin matches
    for (let i = 0; i < groupTeams.length; i++) {
      for (let j = i + 1; j < groupTeams.length; j++) {
        matches.push({
          divisionId: divOid,
          groupId: group._id,
          team1Id: groupTeams[i]._id,
          team2Id: groupTeams[j]._id,
          round: "Group Stage",
          isGroupStage: true,
          phase: "GROUP",
          bracketSlot: null,
          sets: [],
        });
      }
    }
  }
  
  if (matches.length > 0) {
    await Match.insertMany(matches);
    console.log(`Created ${matches.length} matches`);
  }
  
  // Reset division state unconditionally (covers re-generation after a previous playoff advance)
  await Division.findByIdAndUpdate(divOid, {
    groupPlayoffState: "GROUP_STAGE",
  });
  
  console.log("Force generate groups completed successfully!");
  
  // Redirect to refresh the page
  redirect(`/admin/t/${tournamentSlug}/d/${divisionId}/groups`);
}
