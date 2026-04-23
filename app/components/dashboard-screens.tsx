"use client";

import { useState } from "react";
import Link from "next/link";
import { Btn, Chip, SketchBox } from "./primitives";
import { Filters, PageHeader, SidebarNav, StatusChip, ViewToggle } from "./chrome";
import { fmtDateRange, toDisplayStatus, type TournamentRow } from "@/app/lib/data";

function tournamentHref(t: TournamentRow): string {
  return t.status === "DRAFT" ? `/admin/new/${t.id}/review` : `/admin/t/${t.slug}`;
}

function TournamentCard({ t }: { t: TournamentRow }) {
  const dateRange = fmtDateRange(t.startDate, t.endDate);
  return (
    <Link href={tournamentHref(t)} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      <SketchBox style={{ padding: 0, width: "100%", height: "100%" }} fill="#faf7f2">
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div className="wf-serif" style={{ fontSize: 18, lineHeight: 1.15 }}>{t.name}</div>
            <StatusChip status={toDisplayStatus(t.status)} />
          </div>
          <div className="wf-hand" style={{ fontSize: 14, color: "var(--ink-muted)" }}>
            {dateRange}{t.venue ? ` · ${t.venue}` : ""}
          </div>
          <div style={{ display: "flex", gap: 14, fontFamily: "Poppins", fontSize: 13, marginTop: 4 }}>
            <div><span style={{ color: "var(--green)", fontWeight: 700 }}>{t.divisionCount}</span> divisions</div>
            <div><span style={{ color: "var(--green)", fontWeight: 700 }}>{t.teamCount}</span> teams</div>
          </div>
          <div style={{ flex: 1 }} />
        </div>
      </SketchBox>
    </Link>
  );
}

function TournamentsCards({ tournaments }: { tournaments: TournamentRow[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, padding: "0 24px 24px" }}>
      {tournaments.map((t) => (
        <div key={t.id} style={{ height: 150 }}>
          <TournamentCard t={t} />
        </div>
      ))}
      <Link href="/admin/new" style={{ height: 150, textDecoration: "none" }}>
        <div style={{
          height: "100%",
          border: "1.5px dashed var(--line-soft)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: "var(--ink-muted)",
          fontFamily: "Poppins",
          cursor: "pointer",
        }}>
          <div style={{ fontSize: 28, lineHeight: 1, color: "var(--green)" }}>+</div>
          <div style={{ fontSize: 14 }}>New tournament</div>
        </div>
      </Link>
    </div>
  );
}

function TournamentsTable({ tournaments }: { tournaments: TournamentRow[] }) {
  return (
    <div style={{ padding: "0 24px 24px" }}>
      <SketchBox fill="#faf7f2" style={{ padding: 0 }}>
        <div style={{
          padding: "10px 16px",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 0.7fr 0.7fr 1fr 0.8fr",
          gap: 12,
          fontSize: 11,
          color: "var(--ink-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          borderBottom: "1px dashed var(--line-soft)",
          fontFamily: "Poppins",
        }}>
          <div>Name</div><div>Dates</div><div>Div.</div><div>Teams</div><div>Public link</div><div>Status</div>
        </div>
        {tournaments.map((t, i) => (
          <Link
            key={t.id}
            href={tournamentHref(t)}
            style={{
              padding: "12px 16px",
              display: "grid",
              gridTemplateColumns: "2fr 1fr 0.7fr 0.7fr 1fr 0.8fr",
              gap: 12,
              alignItems: "center",
              borderBottom: i < tournaments.length - 1 ? "1px solid var(--paper-2)" : "none",
              fontFamily: "Poppins",
              fontSize: 14,
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <div className="wf-serif" style={{ fontSize: 16 }}>{t.name}</div>
            <div style={{ fontSize: 13 }}>{fmtDateRange(t.startDate, t.endDate)}</div>
            <div>{t.divisionCount}</div>
            <div>{t.teamCount}</div>
            <div style={{ fontFamily: "Poppins, sans-serif", fontSize: 11, color: "var(--green)" }}>
              /t/{t.slug}
            </div>
            <div><StatusChip status={toDisplayStatus(t.status)} /></div>
          </Link>
        ))}
      </SketchBox>
    </div>
  );
}

export function DashboardView({
  tournaments,
  initialMode = "cards",
}: {
  tournaments: TournamentRow[];
  initialMode?: "cards" | "table";
}) {
  const [mode, setMode] = useState<"cards" | "table">(initialMode);
  const live = tournaments.filter((t) => t.status === "LIVE").length;
  const subtitle = `${tournaments.length} tournament${tournaments.length !== 1 ? "s" : ""}${live > 0 ? `, ${live} live` : ""}`;

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PageHeader
          title="Tournaments"
          subtitle={subtitle}
          rightSlot={
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ViewToggle mode={mode} onSet={setMode} />
              <Link href="/admin/new" style={{ textDecoration: "none" }}>
                <Btn primary>+ New tournament</Btn>
              </Link>
            </div>
          }
        />
        <Filters />
        {mode === "cards"
          ? <TournamentsCards tournaments={tournaments} />
          : <TournamentsTable tournaments={tournaments} />}
      </div>
    </div>
  );
}

export function EmptyDashboardView() {
  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <PageHeader
          title="Tournaments"
          rightSlot={
            <Link href="/admin/new" style={{ textDecoration: "none" }}>
              <Btn primary>+ New tournament</Btn>
            </Link>
          }
        />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{
            maxWidth: 420,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}>
            <svg width="160" height="100" viewBox="0 0 160 100" fill="none">
              <rect x="10" y="20" width="140" height="60" rx="4" fill="none" stroke="#1f4d3a" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="80" y1="20" x2="80" y2="80" stroke="#1f4d3a" strokeWidth="1.5" />
              <line x1="10" y1="50" x2="150" y2="50" stroke="#1f4d3a" strokeWidth="1" />
              <circle cx="80" cy="50" r="6" fill="#f4d35e" stroke="#1a1a1a" strokeWidth="1" />
              <text x="80" y="12" fontFamily="Poppins" fontSize="11" fill="#1a1a1a" textAnchor="middle">padel court</text>
            </svg>
            <div className="wf-serif" style={{ fontSize: 24 }}>No tournaments yet</div>
            <div className="wf-hand muted" style={{ fontSize: 16, lineHeight: 1.3, maxWidth: 340 }}>
              Create your first tournament to start adding divisions, teams, and brackets.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <Link href="/admin/new" style={{ textDecoration: "none" }}>
                <Btn primary>+ New tournament</Btn>
              </Link>
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--line-soft)", width: "100%" }}>
              <div className="wf-hand muted" style={{ fontSize: 13, marginBottom: 6 }}>or start from a template</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Chip>Weekend Open</Chip>
                <Chip>Club Championship</Chip>
                <Chip>Mixed Night</Chip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
