import { connectDB } from "../app/lib/db";
import { Division } from "../app/lib/models/Division";
import { Team } from "../app/lib/models/Team";
import { Group } from "../app/lib/models/Group";
import { Match } from "../app/lib/models/Match";
import { Tournament } from "../app/lib/models/Tournament";

async function diagnose() {
  await connectDB();
  
  // Find the "Ale test 3" tournament
  const tournament = await Tournament.findOne({ name: /Ale test 3/i }).lean();
  if (!tournament) {
    console.log("Tournament 'Ale test 3' not found");
    process.exit(0);
  }
  
  console.log(`=== Tournament: ${tournament.name} (${tournament._id}) ===\n`);
  
  // Find the division
  const division = await Division.findOne({ tournamentId: tournament._id }).lean();
  if (!division) {
    console.log("No division found");
    process.exit(0);
  }
  
  console.log(`=== Division: ${division.name} (${division._id}) ===`);
  console.log(`Format: ${division.format}`);
  console.log(`Group Playoff Config:`, division.groupPlayoffConfig);
  console.log(`Group Playoff State: ${division.groupPlayoffState}\n`);
  
  // Check teams
  const teams = await Team.find({ divisionId: division._id }).sort({ seed: 1 }).lean();
  console.log(`=== Teams (${teams.length}) ===`);
  teams.forEach((team, i) => {
    console.log(`${i + 1}. ${team.player1} / ${team.player2} (seed: ${team.seed || 'none'})`);
    console.log(`   ID: ${team._id}`);
    console.log(`   GroupId: ${team.groupId || 'none'}`);
  });
  console.log();
  
  // Check groups
  const groups = await Group.find({ divisionId: division._id }).sort({ order: 1 }).lean();
  console.log(`=== Groups (${groups.length}) ===`);
  groups.forEach((group) => {
    console.log(`${group.name}: ${group._id}`);
  });
  console.log();
  
  // Check matches
  const matches = await Match.find({ divisionId: division._id, isGroupStage: true }).lean();
  console.log(`=== Group Stage Matches (${matches.length}) ===`);
  matches.forEach((match) => {
    console.log(`Match ${match._id}: ${match.team1Id} vs ${match.team2Id} (Group: ${match.groupId})`);
  });
  console.log();
  
  // Check team-to-group mapping
  console.log(`=== Team-to-Group Mapping ===`);
  for (const group of groups) {
    const groupTeams = teams.filter(t => t.groupId?.toString() === group._id.toString());
    console.log(`Group ${group.name}: ${groupTeams.length} teams`);
    groupTeams.forEach(team => {
      console.log(`  - ${team.player1} / ${team.player2}`);
    });
  }
  
  process.exit(0);
}

diagnose().catch(console.error);
