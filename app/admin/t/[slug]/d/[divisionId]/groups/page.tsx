import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import { Tournament } from "@/app/lib/models/Tournament";
import { Division } from "@/app/lib/models/Division";
import { Team } from "@/app/lib/models/Team";
import { Group } from "@/app/lib/models/Group";
import { Match } from "@/app/lib/models/Match";
import { forceGenerateGroups } from "@/app/lib/actions/forceGenerateGroups";
import { GroupsPageClient } from "./client";

type Params = Promise<{ slug: string; divisionId: string }>;

export type SetScore = { team1: number; team2: number };

export type MatchRow = {
  id: string;
  groupId: string;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  sets: SetScore[];
  scheduledTime: string | null;
};

export type TeamMap = Record<string, string>; // id -> "Player1 / Player2"

export type GroupRow = {
  id: string;
  name: string;
  order: number;
  teams: string[]; // team IDs
  matches: MatchRow[];
};

export type MatchFormat = "ONE_SET" | "BEST_OF_3";

export default async function GroupsPage({ params }: { params: Params }) {
  const { slug, divisionId } = await params;

  await connectDB();
  const divOid = new mongoose.Types.ObjectId(divisionId);

  const [tournament, division, teams, groups, matches] = await Promise.all([
    Tournament.findOne({ slug }).lean(),
    Division.findById(divOid).lean(),
    Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean(),
    Group.find({ divisionId: divOid }).sort({ order: 1 }).lean(),
    Match.find({ divisionId: divOid, isGroupStage: true }).lean(),
  ]);

  if (!tournament || !division) notFound();

  if (division.format !== "GROUP_PLAYOFF") {
    notFound();
  }

  const teamMap: TeamMap = {};
  for (const t of teams) {
    teamMap[t._id.toString()] = `${t.player1} / ${t.player2}`;
  }

  const matchRows: MatchRow[] = matches.map((m) => ({
    id: m._id.toString(),
    groupId: m.groupId?.toString() ?? "",
    team1Id: m.team1Id?.toString() ?? null,
    team2Id: m.team2Id?.toString() ?? null,
    winnerId: m.winnerId?.toString() ?? null,
    sets: (m.sets ?? []).map((s) => ({ team1: s.team1, team2: s.team2 })),
    scheduledTime: m.scheduledTime?.toISOString() ?? null,
  }));

  const groupRows: GroupRow[] = groups.map((g) => ({
    id: g._id.toString(),
    name: g.name,
    order: g.order,
    teams: teams
      .filter((t) => t.groupId?.toString() === g._id.toString())
      .map((t) => t._id.toString()),
    matches: matchRows.filter((m) => m.groupId === g._id.toString()),
  }));

  // Ensure all data is serializable plain objects
  const serializableTeamMap = JSON.parse(JSON.stringify(teamMap));
  const serializableGroupRows = JSON.parse(JSON.stringify(groupRows));
  const serializableTournament = JSON.parse(JSON.stringify(tournament));
  const serializableDivision = JSON.parse(JSON.stringify(division));
  const serializableTeams = JSON.parse(JSON.stringify(teams));
  const serializableGroups = JSON.parse(JSON.stringify(groups));
  const serializableMatches = JSON.parse(JSON.stringify(matches));
  const serializableMatchRows = JSON.parse(JSON.stringify(matchRows));

  async function generate() {
    "use server";
    await forceGenerateGroups(divisionId, slug);
  }

  return (
    <GroupsPageClient
      tournament={serializableTournament}
      division={serializableDivision}
      teams={serializableTeams}
      groups={serializableGroups}
      matches={serializableMatches}
      teamMap={serializableTeamMap}
      matchRows={serializableMatchRows}
      groupRows={serializableGroupRows}
      generateAction={generate}
    />
  );
}
