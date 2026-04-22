import { connectDB } from "../app/lib/db";
import { Division } from "../app/lib/models/Division";

async function migrate() {
  await connectDB();
  
  // Update all GROUP_PLAYOFF divisions that don't have a state to default to GROUP_STAGE
  const result = await Division.updateMany(
    { 
      format: "GROUP_PLAYOFF", 
      groupPlayoffState: { $exists: false } 
    },
    { 
      $set: { groupPlayoffState: "GROUP_STAGE" } 
    }
  );

  console.log(`Updated ${result.modifiedCount} GROUP_PLAYOFF divisions to have GROUP_STAGE state`);
  
  process.exit(0);
}

migrate().catch(console.error);
