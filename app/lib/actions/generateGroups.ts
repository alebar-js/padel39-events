"use server";

import { connectDB } from "../db";
import { Division } from "../models/Division";
import { Team } from "../models/Team";
import { Group } from "../models/Group";
import { Match } from "../models/Match";
import mongoose from "mongoose";
import { redirect } from "next/navigation";

export async function generateGroups(divisionId: string, tournamentSlug: string) {
  await connectDB();

  const divOid = new mongoose.Types.ObjectId(divisionId);
  
  const [division, teams] = await Promise.all([
    Division.findById(divOid).lean(),
    Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean(),
  ]);

  if (!division || division.format !== "GROUP_PLAYOFF") {
    throw new Error("Division must be GROUP_PLAYOFF format");
  }

  const groupSize = division.groupPlayoffConfig?.groupSize ?? 4;
  
  if (teams.length < groupSize) {
    throw new Error(`Need at least ${groupSize} teams to create groups`);
  }

  // Clean up everything (delete groups, matches, and reset team groupIds)
  console.log("Cleaning up existing data...");
  await Promise.all([
    Group.deleteMany({ divisionId: divOid }),
    // Historically, some group-stage matches were created without isGroupStage=true,
    // which leaves behind orphaned duplicates that render as TBD in the scheduler.
    // Be conservative and delete anything that looks like a group match.
    Match.deleteMany({
      divisionId: divOid,
      $or: [
        { isGroupStage: true },
        { phase: "GROUP" },
        { round: "Group Stage" },
        { groupId: { $exists: true } },
      ],
    }),
    Team.updateMany({ divisionId: divOid }, { $unset: { groupId: 1 } }),
  ]);

  // Create groups
  const numGroups = Math.ceil(teams.length / groupSize);
  const groups: any[] = [];

  for (let i = 0; i < numGroups; i++) {
    groups.push({
      divisionId: divOid,
      name: String.fromCharCode(65 + i), // A, B, C, ...
      order: i,
    });
  }

  const createdGroups = await Group.insertMany(groups);
  console.log(`Created ${numGroups} groups`);

  // Assign teams to groups using individual updates (like the working script)
  console.log("Assigning teams to groups...");
  for (let i = 0; i < teams.length; i++) {
    const groupIndex = i % numGroups;
    const groupId = createdGroups[groupIndex]._id;
    const teamId = teams[i]._id;
    
    console.log(`  ${teams[i].player1} / ${teams[i].player2} -> Group ${createdGroups[groupIndex].name}`);
    
    await Team.findByIdAndUpdate(teamId, { groupId: groupId });
  }

  // Fetch updated teams to verify
  const updatedTeams = await Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean();
  console.log(`Assigned ${updatedTeams.filter(t => t.groupId).length} teams to groups`);

  // Generate round-robin matches
  const matches: any[] = [];
  
  for (const group of createdGroups) {
    const groupTeams = updatedTeams.filter((t) => 
      t.groupId?.toString() === group._id.toString()
    );

    console.log(`Group ${group.name}: ${groupTeams.length} teams`);
    
    // Generate all combinations of matches within the group
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

  // Update division state
  if (!division.groupPlayoffState || division.groupPlayoffState !== "GROUP_STAGE") {
    await Division.findByIdAndUpdate(divOid, {
      groupPlayoffState: "GROUP_STAGE",
    });
  }
  
  console.log("Groups generated successfully!");
  
  // Redirect to refresh the page
  redirect(`/admin/t/${tournamentSlug}/d/${divisionId}/groups`);
}
