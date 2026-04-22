import { connectDB } from "../app/lib/db";
import { Division } from "../app/lib/models/Division";
import { Team } from "../app/lib/models/Team";
import { Group } from "../app/lib/models/Group";
import { Match } from "../app/lib/models/Match";
import { generateGroups } from "../app/lib/actions/generateGroups";

async function fixGroupAssignments() {
  await connectDB();
  
  // Find all GROUP_PLAYOFF divisions
  const divisions = await Division.find({ format: "GROUP_PLAYOFF" }).lean();
  
  console.log(`Found ${divisions.length} GROUP_PLAYOFF divisions`);
  
  for (const division of divisions) {
    console.log(`Processing division: ${division.name}`);
    
    // Get the tournament slug (you'll need to adjust this based on your setup)
    const tournament = await (await import("../app/lib/models/Tournament")).Tournament.findById(division.tournamentId).lean();
    if (!tournament) {
      console.log(`  No tournament found for division ${division.name}`);
      continue;
    }
    
    try {
      // Regenerate groups to fix team assignments
      await generateGroups(division._id.toString(), tournament.slug);
      console.log(`  Fixed group assignments for ${division.name}`);
    } catch (error) {
      console.error(`  Error fixing ${division.name}:`, error);
    }
  }
  
  process.exit(0);
}

fixGroupAssignments().catch(console.error);
