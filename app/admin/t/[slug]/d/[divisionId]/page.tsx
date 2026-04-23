import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import { Division } from "@/app/lib/models/Division";
import { Group } from "@/app/lib/models/Group";
import { Match } from "@/app/lib/models/Match";
import { Team } from "@/app/lib/models/Team";
import { Tournament } from "@/app/lib/models/Tournament";
import { forceGenerateGroups } from "@/app/lib/actions/forceGenerateGroups";
import { generatePlayoffBracket } from "@/app/lib/actions/advanceToPlayoffs";
import { serialize } from "@/app/lib/serialize";
import { GroupPlayoffDivisionClient } from "./client";
import BracketPage from "./bracket/page";
import type { MatchRow as BracketMatchRow, TeamMap as BracketTeamMap } from "./bracket/page";
import type { GroupRow, MatchRow as GroupMatchRow, TeamMap as GroupTeamMap } from "./groups/page";

export default async function AdminDivisionPage(props: PageProps<"/admin/t/[slug]/d/[divisionId]">) {
  const { slug, divisionId } = await props.params;

  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(divisionId)) {
    notFound();
  }

  const divOid = new mongoose.Types.ObjectId(divisionId);

  const [tournament, division] = await Promise.all([
    Tournament.findOne({ slug }).lean(),
    Division.findById(divOid).lean(),
  ]);

  if (!tournament || !division) {
    notFound();
  }

  if (division.tournamentId.toString() !== tournament._id.toString()) {
    notFound();
  }

  if (division.format !== "GROUP_PLAYOFF") {
    return <BracketPage params={Promise.resolve({ slug, divisionId })} />;
  }

  const [teams, groups, groupMatches, bracketMatches] = await Promise.all([
    Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean(),
    Group.find({ divisionId: divOid }).sort({ order: 1 }).lean(),
    Match.find({ divisionId: divOid, isGroupStage: true }).lean(),
    Match.find({ divisionId: divOid, bracketSlot: { $exists: true } }).sort({ bracketSlot: 1 }).lean(),
  ]);

  const teamMap: GroupTeamMap & BracketTeamMap = {};
  for (const team of teams) {
    teamMap[team._id.toString()] = `${team.player1} / ${team.player2}`;
  }

  const groupMatchRows: GroupMatchRow[] = groupMatches.map((match) => ({
    id: match._id.toString(),
    groupId: match.groupId?.toString() ?? "",
    team1Id: match.team1Id?.toString() ?? null,
    team2Id: match.team2Id?.toString() ?? null,
    winnerId: match.winnerId?.toString() ?? null,
    sets: (match.sets ?? []).map((set) => ({ team1: set.team1, team2: set.team2 })),
    scheduledTime: match.scheduledTime?.toISOString() ?? null,
    courtId: match.courtId?.toString() ?? null,
  }));

  const groupRows: GroupRow[] = groups.map((group) => ({
    id: group._id.toString(),
    name: group.name,
    order: group.order,
    teams: teams
      .filter((team) => team.groupId?.toString() === group._id.toString())
      .map((team) => team._id.toString()),
    matches: groupMatchRows.filter((match) => match.groupId === group._id.toString()),
  }));

  const allBracketRows: (BracketMatchRow & { isConsolation: boolean })[] = bracketMatches
    .filter((match) => match.bracketSlot != null)
    .map((match) => ({
      id: match._id.toString(),
      bracketSlot: match.bracketSlot!,
      round: match.round,
      team1Id: match.team1Id?.toString() ?? null,
      team2Id: match.team2Id?.toString() ?? null,
      winnerId: match.winnerId?.toString() ?? null,
      sets: (match.sets ?? []).map((set) => ({ team1: set.team1, team2: set.team2 })),
      scheduledTime: match.scheduledTime?.toISOString() ?? null,
      isConsolation: !!match.isConsolation,
    }));

  const mainRows: BracketMatchRow[] = allBracketRows
    .filter((match) => !match.isConsolation)
    .map((match) => {
      const { isConsolation, ...row } = match;
      void isConsolation;
      return row;
    });
  const backRows: BracketMatchRow[] = allBracketRows
    .filter((match) => match.isConsolation)
    .map((match) => {
      const { isConsolation, ...row } = match;
      void isConsolation;
      return row;
    });

  async function generateGroupsAction() {
    "use server";
    await forceGenerateGroups(divisionId, slug);
  }

  async function generatePlayoffAction() {
    "use server";
    const result = await generatePlayoffBracket(divisionId, slug);
    if (result.error) {
      console.error("[generatePlayoffBracket]", result.error);
    }
  }

  return (
    <GroupPlayoffDivisionClient
      tournament={serialize(tournament)}
      division={serialize(division)}
      teamMap={serialize(teamMap)}
      groupRows={serialize(groupRows)}
      mainRows={serialize(mainRows)}
      backRows={serialize(backRows)}
      initialTab={division.groupPlayoffState === "PLAYOFF_STAGE" ? "playoffs" : "groups"}
      generateGroupsAction={generateGroupsAction}
      generatePlayoffAction={generatePlayoffAction}
    />
  );
}
