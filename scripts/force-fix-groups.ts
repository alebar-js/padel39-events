import { connectDB } from "../app/lib/db";
import { Division } from "../app/lib/models/Division";
import { Team } from "../app/lib/models/Team";
import { Group } from "../app/lib/models/Group";
import { Match } from "../app/lib/models/Match";
import { Tournament } from "../app/lib/models/Tournament";

async function forceFix() {
  await connectDB();
  
  // Find the "Ale test 3" tournament
  const tournament = await Tournament.findOne({ name: /Ale test 3/i }).lean();
  if (!tournament) {
    console.log("Tournament 'Ale test 3' not found");
    process.exit(0);
  }
  
  console.log(`Fixing tournament: ${tournament.name}`);
  
  // Find the division
  const division = await Division.findOne({ tournamentId: tournament._id }).lean();
  if (!division) {
    console.log("No division found");
    process.exit(0);
  }
  
  const divOid = division._id;
  console.log(`Division: ${division.name} (${divOid})`);
  
  // Get teams
  const teams = await Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean();
  console.log(`Found ${teams.length} teams`);
  
  // Clean up everything
  console.log("Cleaning up existing data...");
  await Promise.all([
    Group.deleteMany({ divisionId: divOid }),
    Match.deleteMany({ divisionId: divOid, isGroupStage: true }),
  ]);
  
  // Reset all team groupIds
  console.log("Resetting team groupIds...");
  for (const team of teams) {
    await Team.findByIdAndUpdate(team._id, { $unset: { groupId: 1 } });
  }
  
  // Create new groups
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
  
  // Assign teams to groups
  console.log("Assigning teams to groups...");
  for (let i = 0; i < teams.length; i++) {
    const groupIndex = i % numGroups;
    const groupId = createdGroups[groupIndex]._id;
    const teamId = teams[i]._id;
    
    console.log(`  ${teams[i].player1} / ${teams[i].player2} -> Group ${createdGroups[groupIndex].name}`);
    
    await Team.findByIdAndUpdate(teamId, { groupId: groupId });
  }
  
  // Create matches
  console.log("Creating matches...");
  const matches: any[] = [];
  
  // Fetch updated teams after assignment
  const updatedTeams = await Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean();
  
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
  
  // Verify the fix
  console.log("\n=== Verification ===");
  const finalTeams = await Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean();
  const finalGroups = await Group.find({ divisionId: divOid }).sort({ order: 1 }).lean();
  
  for (const group of finalGroups) {
    const groupTeams = finalTeams.filter(t => t.groupId?.toString() === group._id.toString());
    console.log(`Group ${group.name}: ${groupTeams.length} teams`);
    groupTeams.forEach(team => {
      console.log(`  - ${team.player1} / ${team.player2}`);
    });
  }
  
  console.log("\nFix completed successfully!");
  process.exit(0);
}

forceFix().catch(console.error);
