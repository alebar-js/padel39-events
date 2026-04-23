import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import { Tournament } from "@/app/lib/models/Tournament";
import { Division } from "@/app/lib/models/Division";
import { Team } from "@/app/lib/models/Team";
import { Match } from "@/app/lib/models/Match";
import { SidebarNav } from "@/app/components/chrome";
import { generateBracket } from "@/app/lib/actions/generateBracket";
import { generatePlayoffBracket } from "@/app/lib/actions/advanceToPlayoffs";
import { BracketView } from "./client";

type Params = Promise<{ slug: string; divisionId: string }>;

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

export type TeamMap = Record<string, string>; // id → "Player1 / Player2"

export type MatchFormat = "ONE_SET" | "BEST_OF_3";

export default async function BracketPage({ params }: { params: Params }) {
  const { slug, divisionId } = await params;

  await connectDB();
  const divOid = new mongoose.Types.ObjectId(divisionId);

  const [tournament, division, teams, matches] = await Promise.all([
    Tournament.findOne({ slug }).lean(),
    Division.findById(divOid).lean(),
    Team.find({ divisionId: divOid }).sort({ seed: 1 }).lean(),
    Match.find({ divisionId: divOid, bracketSlot: { $exists: true } }).sort({ bracketSlot: 1 }).lean(),
  ]);

  if (!tournament || !division) notFound();

  const teamMap: TeamMap = {};
  for (const t of teams) {
    teamMap[t._id.toString()] = `${t.player1} / ${t.player2}`;
  }

  const allRows: (MatchRow & { isConsolation: boolean })[] = matches
    .filter((m) => m.bracketSlot != null)
    .map((m) => ({
      id: m._id.toString(),
      bracketSlot: m.bracketSlot!,
      round: m.round,
      team1Id: m.team1Id?.toString() ?? null,
      team2Id: m.team2Id?.toString() ?? null,
      winnerId: m.winnerId?.toString() ?? null,
      sets: (m.sets ?? []).map((s) => ({ team1: s.team1, team2: s.team2 })),
      scheduledTime: m.scheduledTime?.toISOString() ?? null,
      isConsolation: !!m.isConsolation,
    }));

  const mainRows: MatchRow[] = allRows.filter((m) => !m.isConsolation).map(({ isConsolation: _c, ...r }) => r);
  const backRows: MatchRow[] = allRows.filter((m) => m.isConsolation).map(({ isConsolation: _c, ...r }) => r);

  // Ensure all data is serializable plain objects
  const serializableMainRows = JSON.parse(JSON.stringify(mainRows));
  const serializableBackRows = JSON.parse(JSON.stringify(backRows));
  const serializableTeamMap = JSON.parse(JSON.stringify(teamMap));
  const serializableTournament = JSON.parse(JSON.stringify(tournament));
  const serializableDivision = JSON.parse(JSON.stringify(division));
  const serializableTeams = JSON.parse(JSON.stringify(teams));

  const hasBracket = mainRows.length > 0;

  async function generate() {
    "use server";
    if (serializableDivision.format === "GROUP_PLAYOFF") {
      const result = await generatePlayoffBracket(divisionId, slug);
      if (result.error) console.error("[generatePlayoffBracket]", result.error);
    } else {
      await generateBracket(divisionId, slug);
    }
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
            ← {serializableTournament.name}
          </Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div>
              <div className="wf-serif" style={{ fontSize: 22 }}>
                {serializableDivision.name} · Bracket
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {serializableTeams.length} team{serializableTeams.length !== 1 ? "s" : ""}
              </div>
            </div>
            {hasBracket && (
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
                  Regenerate
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Body */}
        {!hasBracket ? (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}>
            {teams.length < 2 ? (
              <div style={{ textAlign: "center" }}>
                <div className="wf-serif" style={{ fontSize: 20, marginBottom: 8 }}>Not enough teams</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  Add at least 2 teams before generating the bracket.
                </div>
              </div>
            ) : (
              <>
                <div className="wf-serif" style={{ fontSize: 20 }}>No bracket yet</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {teams.length} teams seeded and ready.
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
                    Generate Bracket
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <BracketView
            matches={serializableMainRows}
            backMatches={serializableBackRows}
            teamMap={serializableTeamMap}
            divisionId={divisionId}
            tournamentSlug={slug}
            matchFormat={(serializableDivision.matchFormat ?? "BEST_OF_3") as MatchFormat}
          />
        )}
      </div>
    </div>
  );
}
