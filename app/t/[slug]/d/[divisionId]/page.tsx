import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { SidebarNav, StatusChip } from "@/app/components/chrome";
import { connectDB } from "@/app/lib/db";
import { fmtDateRange, toDisplayStatus } from "@/app/lib/data";
import { Division } from "@/app/lib/models/Division";
import { Match } from "@/app/lib/models/Match";
import { Team } from "@/app/lib/models/Team";
import { Tournament } from "@/app/lib/models/Tournament";
import { serialize } from "@/app/lib/serialize";
import { PublicBracketView } from "./client";

export type SetScore = { team1: number; team2: number };

export type MatchRow = {
  id: string;
  bracketSlot: number;
  round: string;
  team1Id: string | null;
  team2Id: string | null;
  winnerId: string | null;
  sets: SetScore[];
  scheduledTime: string | null;
};

export type TeamMap = Record<string, string>;
export type MatchFormat = "ONE_SET" | "BEST_OF_3";

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIM_CONSOLATION: "Single Elim + Back Draw",
  GROUP_PLAYOFF: "Groups + Playoffs",
};

export default async function DivisionPage(props: PageProps<"/t/[slug]/d/[divisionId]">) {
  const { slug, divisionId } = await props.params;

  await connectDB();

  if (!mongoose.Types.ObjectId.isValid(divisionId)) {
    notFound();
  }

  const divOid = new mongoose.Types.ObjectId(divisionId);

  const [tournament, division, teams, matches] = await Promise.all([
    Tournament.findOne({ slug }).lean(),
    Division.findById(divOid).lean(),
    Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean(),
    Match.find({ divisionId: divOid, bracketSlot: { $exists: true } }).sort({ bracketSlot: 1 }).lean(),
  ]);

  if (!tournament || !division) {
    notFound();
  }

  if (division.tournamentId.toString() !== tournament._id.toString()) {
    notFound();
  }

  const teamMap: TeamMap = {};
  for (const team of teams) {
    teamMap[team._id.toString()] = `${team.player1} / ${team.player2}`;
  }

  const allRows: (MatchRow & { isConsolation: boolean })[] = matches
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

  const mainRows: MatchRow[] = allRows
    .filter((match) => !match.isConsolation)
    .map((match) => {
      const { isConsolation, ...row } = match;
      void isConsolation;
      return row;
    });
  const backRows: MatchRow[] = allRows
    .filter((match) => match.isConsolation)
    .map((match) => {
      const { isConsolation, ...row } = match;
      void isConsolation;
      return row;
    });

  const dateRange = fmtDateRange(
    tournament.startDate.toISOString(),
    tournament.endDate.toISOString()
  );
  const hasBracket = mainRows.length > 0;
  const formatLabel = FORMAT_LABELS[division.format] ?? division.format;

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--paper-2)" }}>
          <Link
            href={`/t/${slug}`}
            className="muted"
            style={{ fontSize: 14, textDecoration: "none" }}
          >
            ← {tournament.name}
          </Link>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
              marginTop: 8,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div className="wf-serif" style={{ fontSize: 28, lineHeight: 1 }}>
                  {division.name}
                </div>
                <StatusChip status={toDisplayStatus(tournament.status)} />
              </div>
              <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                {dateRange}
                {tournament.venue ? ` · ${tournament.venue}` : ""}
                {" · "}{formatLabel}
                {" · "}{teams.length} team{teams.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        {hasBracket ? (
          <PublicBracketView
            matches={serialize(mainRows)}
            backMatches={serialize(backRows)}
            teamMap={serialize(teamMap)}
            matchFormat={serialize((division.matchFormat ?? "BEST_OF_3") as MatchFormat)}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 24px",
            }}
          >
            <div
              style={{
                maxWidth: 520,
                textAlign: "center",
                border: "1px solid var(--paper-2)",
                borderRadius: 12,
                background: "var(--paper)",
                padding: "28px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,.04)",
              }}
            >
              <div className="wf-serif" style={{ fontSize: 24, marginBottom: 10 }}>
                Bracket not available yet
              </div>
              <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
                {division.format === "GROUP_PLAYOFF"
                  ? "This division has not reached a published playoff bracket yet."
                  : "This division does not have a published draw yet."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
