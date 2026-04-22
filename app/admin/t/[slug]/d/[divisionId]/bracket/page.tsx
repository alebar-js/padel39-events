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
    Match.find({ divisionId: divOid, isConsolation: false }).sort({ bracketSlot: 1 }).lean(),
  ]);

  if (!tournament || !division) notFound();

  const teamMap: TeamMap = {};
  for (const t of teams) {
    teamMap[t._id.toString()] = `${t.player1} / ${t.player2}`;
  }

  const matchRows: MatchRow[] = matches
    .filter((m) => m.bracketSlot != null)
    .map((m) => ({
      id: m._id.toString(),
      bracketSlot: m.bracketSlot!,
      round: m.round,
      team1Id: m.team1Id?.toString() ?? null,
      team2Id: m.team2Id?.toString() ?? null,
      winnerId: m.winnerId?.toString() ?? null,
      sets: (m.sets ?? []).map((s) => ({ team1: s.team1, team2: s.team2 })),
    }));

  const hasBracket = matchRows.length > 0;

  async function generate() {
    "use server";
    await generateBracket(divisionId, slug);
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
            ← {tournament.name}
          </Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div>
              <div className="wf-serif" style={{ fontSize: 22 }}>
                {division.name} · Bracket
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {teams.length} team{teams.length !== 1 ? "s" : ""}
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
            matches={matchRows}
            teamMap={teamMap}
            divisionId={divisionId}
            tournamentSlug={slug}
            matchFormat={(division.matchFormat ?? "BEST_OF_3") as MatchFormat}
          />
        )}
      </div>
    </div>
  );
}
