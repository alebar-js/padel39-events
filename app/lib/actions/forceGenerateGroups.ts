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

  // Clean up everything FIRST
  console.log("Cleaning up existing data...");
  await Promise.all([
    Group.deleteMany({ divisionId: divOid }),
    Match.deleteMany({ divisionId: divOid, isGroupStage: true }),
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
  
  // Create groups
  const numGroups = Math.ceil(teams.length / 4); // Default to 4 per group
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
  
  // Delete all teams and recreate them with group assignments (like the working script)
  console.log("Deleting and recreating teams with group assignments...");
  
  // Store team data before deletion
  const teamData = teams.map(t => ({
    player1: t.player1,
    player2: t.player2,
    seed: t.seed,
  }));
  
  // Delete all teams
  await Team.deleteMany({ divisionId: divOid });
  
  // Recreate teams with group assignments
  const teamsToInsert: any[] = [];
  for (let i = 0; i < teamData.length; i++) {
    const groupIndex = i % numGroups;
    const groupId = createdGroups[groupIndex]._id;
    
    console.log(`  Creating ${teamData[i].player1} / ${teamData[i].player2} -> Group ${createdGroups[groupIndex].name} (${groupId.toString()})`);
    
    teamsToInsert.push({
      divisionId: divOid,
      player1: teamData[i].player1,
      player2: teamData[i].player2,
      seed: teamData[i].seed,
      groupId: new mongoose.Types.ObjectId(groupId.toString()),
    });
  }
  
  // Insert teams one by one to ensure groupId is saved
  for (const teamData of teamsToInsert) {
    await Team.create(teamData);
  }
  
  // Fetch the recreated teams
  const updatedTeams = await Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean();
  console.log(`Recreated ${updatedTeams.length} teams with groupIds`);
  
  // Verify the assignments
  console.log("Team assignments after recreation:");
  for (let i = 0; i < updatedTeams.length; i++) {
    const team = updatedTeams[i];
    console.log(`  ${i+1}. ${team.player1} / ${team.player2} -> groupId: ${team.groupId?.toString() || 'none'}`);
  }
  
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
  
  // Update division state
  if (!division.groupPlayoffState || division.groupPlayoffState !== "GROUP_STAGE") {
    await Division.findByIdAndUpdate(divOid, {
      groupPlayoffState: "GROUP_STAGE",
    });
  }
  
  console.log("Force generate groups completed successfully!");
  
  // Redirect to refresh the page
  redirect(`/admin/t/${tournamentSlug}/d/${divisionId}/groups`);
}
