import { connectDB } from "./db";
import { Tournament } from "./models/Tournament";
import { Division } from "./models/Division";
import { Team } from "./models/Team";
import type { TournamentRow } from "./data";

export async function listTournaments(): Promise<TournamentRow[]> {
  await connectDB();
  const docs = await Tournament.find({ startDate: { $exists: true }, endDate: { $exists: true } }).sort({ startDate: -1 }).lean();
  
  const tournamentIds = docs.map((d: any) => d._id);
  
  // Fetch divisions first, then teams
  const divisions = await Division.find({ tournamentId: { $in: tournamentIds } }).lean();
  const divisionIds = divisions.map((d: any) => d._id);
  const teams = await Team.find({ divisionId: { $in: divisionIds } }).lean();
  
  // Count divisions and teams per tournament
  const divisionCounts: Record<string, number> = {};
  const teamCounts: Record<string, number> = {};
  
  divisions.forEach((div: any) => {
    const tId = div.tournamentId.toString();
    divisionCounts[tId] = (divisionCounts[tId] || 0) + 1;
  });
  
  teams.forEach((team: any) => {
    const divId = team.divisionId.toString();
    const division = divisions.find((d: any) => d._id.toString() === divId);
    if (division) {
      const tId = division.tournamentId.toString();
      teamCounts[tId] = (teamCounts[tId] || 0) + 1;
    }
  });
  
  return docs.map((d: any) => ({
    id: d._id.toString(),
    name: d.name,
    slug: d.slug,
    venue: d.venue,
    startDate: d.startDate.toISOString(),
    endDate: d.endDate.toISOString(),
    status: d.status,
    divisionCount: divisionCounts[d._id.toString()] || 0,
    teamCount: teamCounts[d._id.toString()] || 0,
  }));
}
