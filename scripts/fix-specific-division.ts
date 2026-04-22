import { connectDB } from "../app/lib/db";
import { Division } from "../app/lib/models/Division";
import { Team } from "../app/lib/models/Team";
import { Group } from "../app/lib/models/Group";
import { Match } from "../app/lib/models/Match";
import { Tournament } from "../app/lib/models/Tournament";
import { generateGroups } from "../app/lib/actions/generateGroups";

async function fixSpecificDivision() {
  await connectDB();
  
  // Find the "Ale test 3" tournament
  const tournament = await Tournament.findOne({ name: /Ale test 3/i }).lean();
  if (!tournament) {
    console.log("Tournament 'Ale test 3' not found");
    process.exit(0);
  }
  
  console.log(`Found tournament: ${tournament.name} (${tournament._id})`);
  
  // Find all divisions in this tournament
  const divisions = await Division.find({ tournamentId: tournament._id }).lean();
  console.log(`Found ${divisions.length} divisions in tournament`);
  
  for (const division of divisions) {
    console.log(`\nProcessing division: ${division.name} (${division._id})`);
    console.log(`Format: ${division.format}`);
    
    if (division.format !== "GROUP_PLAYOFF") {
      console.log("  Skipping - not GROUP_PLAYOFF format");
      continue;
    }
    
    try {
      // Check current state
      const teams = await Team.find({ divisionId: division._id }).lean();
      const groups = await Group.find({ divisionId: division._id }).lean();
      const teamsWithGroups = teams.filter(t => t.groupId).length;
      
      console.log(`  Current state: ${teams.length} teams, ${groups.length} groups, ${teamsWithGroups} teams assigned to groups`);
      
      // Regenerate groups
      await generateGroups(division._id.toString(), tournament.slug);
      console.log(`  Successfully regenerated groups for ${division.name}`);
      
    } catch (error) {
      console.error(`  Error fixing ${division.name}:`, error);
    }
  }
  
  process.exit(0);
}

fixSpecificDivision().catch(console.error);
