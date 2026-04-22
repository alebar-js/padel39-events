"use client";

import Link from "next/link";
import type { CourtRow, DayRow, MatchRow } from "./page";

interface HeaderWithButtonProps {
  tournamentName: string;
  tournamentSlug: string;
  courts: CourtRow[];
  days: DayRow[];
  matches: MatchRow[];
  onEditCourts: () => void;
}

export default function HeaderWithButton({ 
  tournamentName, 
  tournamentSlug, 
  courts, 
  days, 
  matches, 
  onEditCourts 
}: HeaderWithButtonProps) {
  return (
    <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--paper-2)", flexShrink: 0 }}>
      <Link
        href={`/admin/t/${tournamentSlug}`}
        className="muted"
        style={{ fontSize: 14, textDecoration: "none" }}
      >
        {"<"} {tournamentName}
      </Link>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
        <div>
          <div className="wf-serif" style={{ fontSize: 22 }}>Order of Play</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {courts.length} court{courts.length !== 1 ? "s" : ""}
            {" · "}
            {days.length} day{days.length !== 1 ? "s" : ""}
            {" · "}
            {matches.filter((m) => m.scheduledTime).length}/{matches.length} scheduled
          </div>
        </div>
      </div>
    </div>
  );
}
