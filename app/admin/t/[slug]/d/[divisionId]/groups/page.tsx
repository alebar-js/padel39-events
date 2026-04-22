import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import { Tournament } from "@/app/lib/models/Tournament";
import { Division } from "@/app/lib/models/Division";
import { Team } from "@/app/lib/models/Team";
import { Group } from "@/app/lib/models/Group";
import { Match } from "@/app/lib/models/Match";
import { SidebarNav } from "@/app/components/chrome";
import { forceGenerateGroups } from "@/app/lib/actions/forceGenerateGroups";
import { GroupsView } from "./client";

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

  const hasGroups = groups.length > 0;

  async function generate() {
    "use server";
    await forceGenerateGroups(divisionId, slug);
  }

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--paper-2)" }}>
          <Link
            href={`/admin/t/${slug}`}
            className="muted"
            style={{ fontSize: 14, textDecoration: "none" }}
          >
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
            {tournament.name}
          </Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div>
              <div className="wf-serif" style={{ fontSize: 22 }}>
                {division.name} · Group Stage
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {teams.length} team{teams.length !== 1 ? "s" : ""} · {groups.length} group{groups.length !== 1 ? "s" : ""}
              </div>
            </div>
            {hasGroups && (
              <form action={generate}>
                <button
                  type="submit"
                  style={{
                    padding: "6px 14px",
                    fontSize: 13,
                    fontFamily: "Poppins, sans-serif",
                    background: "none",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "var(--ink-muted)",
                  }}
                >
                  Regenerate Groups
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Body */}
        {!hasGroups ? (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}>
            {teams.length < 4 ? (
              <div style={{ textAlign: "center" }}>
                <div className="wf-serif" style={{ fontSize: 20, marginBottom: 8 }}>Not enough teams</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  Add at least 4 teams before generating groups.
                </div>
              </div>
            ) : (
              <>
                <div className="wf-serif" style={{ fontSize: 20 }}>No groups yet</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {teams.length} teams ready for group stage.
                </div>
                <form action={generate}>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 24px",
                      fontSize: 15,
                      fontFamily: "Poppins, sans-serif",
                      background: "var(--green)",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    Generate Groups
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <GroupsView
            groups={serializableGroupRows}
            teamMap={serializableTeamMap}
            divisionId={divisionId}
            tournamentSlug={slug}
            matchFormat={(division.matchFormat ?? "BEST_OF_3") as MatchFormat}
            groupSize={division.groupPlayoffConfig?.groupSize ?? 4}
          />
        )}
      </div>
    </div>
  );
}
