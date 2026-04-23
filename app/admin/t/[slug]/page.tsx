import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/app/lib/db";
import { Tournament } from "@/app/lib/models/Tournament";
import { Division } from "@/app/lib/models/Division";
import { Team } from "@/app/lib/models/Team";
import { SidebarNav, StatusChip } from "@/app/components/chrome";
import { Btn } from "@/app/components/primitives";
import { toDisplayStatus, fmtDateRange } from "@/app/lib/data";
import { DivisionSelector, QuickAddForm, BulkAddForm, SortableRoster } from "./client";
import EditInfoButton from "./edit-info-button";

type Params = Promise<{ slug: string }>;
type SP = Promise<{ d?: string }>;

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIM_CONSOLATION: "Single Elim + Back Draw",
  GROUP_PLAYOFF: "Groups + Playoffs",
};

export default async function TournamentDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { slug } = await params;
  const { d } = await searchParams;

  await connectDB();
  const tournament = await Tournament.findOne({ slug }).lean();
  if (!tournament) notFound();

  const divisions = await Division.find({ tournamentId: tournament._id }).sort({ createdAt: 1 }).lean();

  // Resolve active division
  const activeDivision = (d ? divisions.find((div) => div._id.toString() === d) : null) ?? divisions[0] ?? null;

  // Fetch teams for active division + counts for all
  const [teams, teamCounts] = await Promise.all([
    activeDivision ? Team.find({ divisionId: activeDivision._id }).sort({ seed: 1 }).lean() : Promise.resolve([]),
    Promise.all(divisions.map((div) => Team.countDocuments({ divisionId: div._id }))),
  ]);

  const totalTeams = teamCounts.reduce((a, b) => a + b, 0);
  const dateRange = fmtDateRange(tournament.startDate.toISOString(), tournament.endDate.toISOString());

  const divisionRows = divisions.map((d, i) => ({
    id: d._id.toString(),
    name: d.name,
    format: d.format,
    teamCount: teamCounts[i],
  }));

  const toDateInput = (d: Date) => d.toISOString().slice(0, 10);
  const tournamentForModal = {
    id: tournament._id.toString(),
    name: tournament.name,
    slug: tournament.slug,
    venue: tournament.venue ?? "",
    startDate: toDateInput(tournament.startDate),
    endDate: toDateInput(tournament.endDate),
    status: tournament.status,
  };
  const divisionsForModal = divisions.map((d, i) => ({
    id: d._id.toString(),
    name: d.name,
    format: d.format,
    matchFormat: d.matchFormat,
    teamCount: teamCounts[i],
    groupPlayoffConfig: d.groupPlayoffConfig
      ? {
          groupSize: d.groupPlayoffConfig.groupSize,
          playoffSize: d.groupPlayoffConfig.playoffSize,
          qualifyingMode: d.groupPlayoffConfig.qualifyingMode,
        }
      : undefined,
  }));

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 24px 4px" }}>
          <Link href="/admin" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>
            ← Tournaments
          </Link>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="wf-serif" style={{ fontSize: 28, lineHeight: 1 }}>{tournament.name}</div>
                <StatusChip status={toDisplayStatus(tournament.status)} />
              </div>
              <div className="muted" style={{ fontSize: 15, marginTop: 4 }}>
                {dateRange}
                {tournament.venue ? ` · ${tournament.venue}` : ""}
                {" · "}{divisions.length} division{divisions.length !== 1 ? "s" : ""}
                {" · "}{totalTeams} teams
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <EditInfoButton tournament={tournamentForModal} divisions={divisionsForModal} />
              <Link href={`/admin/t/${slug}/schedule`} style={{ textDecoration: "none" }}>
                <Btn small>Schedule</Btn>
              </Link>
              {activeDivision ? (
                activeDivision.format === "GROUP_PLAYOFF" ? (
                  <Link
                    href={`/admin/t/${slug}/d/${activeDivision._id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <Btn small primary>View Division</Btn>
                  </Link>
                ) : (
                  <Link
                    href={`/admin/t/${slug}/d/${activeDivision._id}/bracket`}
                    style={{ textDecoration: "none" }}
                  >
                    <Btn small primary>Brackets →</Btn>
                  </Link>
                )
              ) : (
                <Btn small primary>Brackets →</Btn>
              )}
            </div>
          </div>
        </div>

        {/* Division selector */}
        {divisions.length > 0 && activeDivision ? (
          <DivisionSelector
            divisions={divisionRows}
            activeDivisionId={activeDivision._id.toString()}
            tournamentSlug={slug}
          />
        ) : (
          <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--paper-2)", fontSize: 14, color: "var(--ink-muted)" }}>
            No divisions yet —{" "}
            <Link href={`/admin/new/${tournament._id}/divisions`} style={{ color: "var(--green)" }}>
              add divisions
            </Link>
          </div>
        )}

        {/* Body */}
        {activeDivision ? (
          <div style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 20,
            padding: "16px 24px 24px",
            overflow: "hidden",
          }}>
            {/* Left: roster */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div className="wf-serif" style={{ fontSize: 18 }}>
                  {activeDivision.name} · Entries
                </div>
                <span className="muted" style={{ fontSize: 14 }}>
                  {teams.length} team{teams.length !== 1 ? "s" : ""} · {teams.length * 2} players
                </span>
              </div>

              {teams.length > 0 ? (
                <SortableRoster
                  initialTeams={teams.map((t) => ({
                    id: t._id.toString(),
                    player1: t.player1,
                    player2: t.player2,
                    seed: t.seed ?? 0,
                  }))}
                  tournamentSlug={slug}
                />
              ) : (
                <div style={{
                  flex: 1,
                  border: "1.8px dashed var(--line-soft)",
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: 30,
                  textAlign: "center",
                }}>
                  <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
                    <circle cx="20" cy="22" r="10" fill="none" stroke="#1f4d3a" strokeWidth="1.5" />
                    <circle cx="40" cy="22" r="10" fill="none" stroke="#1f4d3a" strokeWidth="1.5" />
                    <circle cx="60" cy="22" r="10" fill="none" stroke="#1f4d3a" strokeWidth="1.5" strokeDasharray="3 2" />
                  </svg>
                  <div className="wf-serif" style={{ fontSize: 18 }}>No teams yet</div>
                  <div className="muted" style={{ fontSize: 14 }}>Add pairs on the right →</div>
                </div>
              )}
            </div>

            {/* Right: add team */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="wf-serif" style={{ fontSize: 18 }}>Add a team</div>
              <QuickAddForm
                divisionId={activeDivision._id.toString()}
                tournamentSlug={slug}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-muted)" }}>
                <div style={{ flex: 1, height: 1, borderTop: "1px dashed var(--line-soft)" }} />
                <span style={{ fontSize: 12 }}>or paste bulk</span>
                <div style={{ flex: 1, height: 1, borderTop: "1px dashed var(--line-soft)" }} />
              </div>

              <BulkAddForm
                divisionId={activeDivision._id.toString()}
                tournamentSlug={slug}
              />

              <div style={{ paddingTop: 12, borderTop: "1px dashed var(--line-soft)" }}>
                <div className="wf-serif" style={{ fontSize: 16, marginBottom: 4 }}>Format</div>
                <div className="muted" style={{ fontSize: 13 }}>{FORMAT_LABELS[activeDivision.format]}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
