import { connectDB } from "./db";
import { Tournament } from "./models/Tournament";
import type { TournamentRow } from "./data";

export async function listTournaments(): Promise<TournamentRow[]> {
  await connectDB();
  const docs = await Tournament.find({ startDate: { $exists: true }, endDate: { $exists: true } }).sort({ startDate: -1 }).lean();
  return docs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    slug: d.slug,
    venue: d.venue,
    startDate: d.startDate.toISOString(),
    endDate: d.endDate.toISOString(),
    status: d.status,
    divisionCount: 0,
    teamCount: 0,
  }));
}
