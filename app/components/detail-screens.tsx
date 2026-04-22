import Link from "next/link";
import { Btn, Input, SketchBox } from "./primitives";
import { SidebarNav, StatusChip } from "./chrome";
import { DIVISIONS, SAMPLE_TEAMS, type Tournament } from "@/app/lib/data";

export function DetailHeader({ tournament }: { tournament: Tournament }) {
  return (
    <div style={{ padding: "16px 24px 4px" }}>
      <Link href="/" className="wf-hand muted" style={{ fontSize: 14, textDecoration: "none" }}>
        ← Tournaments
      </Link>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 6 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="wf-serif" style={{ fontSize: 28, lineHeight: 1 }}>{tournament.name}</div>
            <StatusChip status={tournament.status} />
          </div>
          <div className="wf-hand muted" style={{ fontSize: 16, marginTop: 4 }}>
            {tournament.dates} · Padel39 Dallas · {tournament.divisions} divisions · {tournament.teams} teams
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small>Edit info</Btn>
          <Link href={`/t/${tournament.slug}?share=1`} style={{ textDecoration: "none" }}>
            <Btn small>Share ⧉</Btn>
          </Link>
          <Btn small primary>Brackets →</Btn>
        </div>
      </div>
    </div>
  );
}

export function DivisionDropdown({
  tournamentSlug,
  active = 0,
  open = false,
}: {
  tournamentSlug: string;
  active?: number;
  open?: boolean;
}) {
  const cur = DIVISIONS[active];
  return (
    <div style={{
      padding: "12px 24px 10px",
      borderBottom: "1px solid var(--paper-2)",
      display: "flex",
      alignItems: "center",
      gap: 16,
      position: "relative",
    }}>
      <div style={{
        fontFamily: "Poppins",
        fontSize: 11,
        color: "var(--ink-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
      }}>
        Division
      </div>

      <div style={{ position: "relative" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 12px",
          minWidth: 260,
          border: "1.5px solid var(--line)",
          borderRadius: 6,
          background: "var(--paper)",
          cursor: "pointer",
        }}>
          <span className="wf-serif" style={{ fontSize: 17 }}>{cur.name}</span>
          <span style={{ fontFamily: "Poppins", fontSize: 12, color: "var(--ink-muted)" }}>· {cur.format}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontFamily: "Poppins, sans-serif", fontSize: 11, color: "var(--green)" }}>
            {cur.teams} teams
          </span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>▾</span>
        </div>

        {open && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: 340,
            background: "var(--paper)",
            border: "1.5px solid var(--line)",
            borderRadius: 6,
            boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
            zIndex: 10,
            padding: 4,
          }}>
            {DIVISIONS.map((d, i) => (
              <Link
                key={d.id}
                href={`/t/${tournamentSlug}/d/${d.id}`}
                style={{
                  padding: "8px 10px",
                  borderRadius: 4,
                  background: i === active ? "var(--green-tint)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <span className={i === active ? "wf-check" : "wf-circle"} />
                <div style={{ flex: 1 }}>
                  <div className="wf-serif" style={{ fontSize: 14, color: i === active ? "var(--green)" : "var(--ink)" }}>
                    {d.name}
                  </div>
                  <div style={{ fontFamily: "Poppins", fontSize: 11, color: "var(--ink-muted)" }}>{d.format}</div>
                </div>
                <span style={{ fontFamily: "Poppins, sans-serif", fontSize: 11, color: "var(--ink-muted)" }}>
                  {d.teams}
                </span>
              </Link>
            ))}
            <div style={{
              borderTop: "1px dashed var(--line-soft)",
              marginTop: 4,
              padding: "8px 10px",
              fontFamily: "Poppins",
              fontSize: 13,
              color: "var(--green)",
              cursor: "pointer",
            }}>
              + New division
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <Btn small>Rename</Btn>
      <Btn small>Change format</Btn>
    </div>
  );
}

export function FormatSelector({ selected = 0 }: { selected?: number }) {
  const formats = [
    { name: "Single Elim + Back Draw", desc: "Bracket knockout. First-round losers drop into a consolation back draw." },
    { name: "Single Elim", desc: "Straight knockout. One loss and you are out." },
    { name: "Groups + Playoffs", desc: "N groups of M pairs round-robin; top finishers advance to a playoff bracket." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {formats.map((f, i) => (
        <div key={f.name} style={{
          padding: 10,
          border: "1.5px " + (i === selected ? "solid var(--green)" : "dashed var(--line-soft)"),
          borderRadius: 6,
          background: i === selected ? "var(--green-tint)" : "transparent",
          cursor: "pointer",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span className={i === selected ? "wf-check" : "wf-circle"} />
            <span style={{ fontFamily: "Poppins", fontSize: 14, fontWeight: 600 }}>{f.name}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-muted)", fontFamily: "Poppins", lineHeight: 1.35 }}>
            {f.desc}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RosterTable({ compact }: { compact?: boolean }) {
  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "28px 26px 1.2fr 1.2fr 40px",
        gap: 8,
        padding: "6px 10px",
        fontSize: 10,
        color: "var(--ink-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        fontFamily: "Poppins",
        borderBottom: "1px dashed var(--line-soft)",
      }}>
        <div></div><div>#</div><div>Player 1</div><div>Player 2</div><div></div>
      </div>
      {SAMPLE_TEAMS.slice(0, compact ? 6 : 8).map((t) => (
        <div key={t.seed} style={{
          display: "grid",
          gridTemplateColumns: "28px 26px 1.2fr 1.2fr 40px",
          gap: 8,
          padding: "8px 10px",
          alignItems: "center",
          fontFamily: "Poppins",
          fontSize: 14,
          borderBottom: "1px solid var(--paper-2)",
        }}>
          <span className="wf-drag" />
          <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{t.seed}</span>
          <span>{t.p1}</span>
          <span>{t.p2}</span>
          <span style={{ color: "var(--ink-muted)", textAlign: "right", cursor: "pointer" }}>⋯</span>
        </div>
      ))}
    </div>
  );
}

export function BulkAddBox({ compact }: { compact?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: "Poppins", fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <span>Add teams</span>
        <span className="muted" style={{ fontSize: 11 }}>one per line · &quot;Player 1, Player 2&quot;</span>
      </div>
      <div style={{
        border: "1.5px solid var(--line)",
        borderRadius: 6,
        padding: 10,
        minHeight: compact ? 80 : 120,
        fontFamily: "Poppins, sans-serif",
        fontSize: 11,
        color: "var(--ink-muted)",
        background: "var(--paper)",
        lineHeight: 1.6,
      }}>
        <div style={{ color: "var(--ink)" }}>Maria Ruiz, Ana García</div>
        <div style={{ color: "var(--ink)" }}>Carlos Lopez, Diego Torres</div>
        <div style={{ color: "var(--ink)" }}>Sofia Mendez, Lucia Vega</div>
        <div>│</div>
        {!compact && <div style={{ opacity: 0.5 }}>Pedro Nava, Javier Ortiz</div>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <span className="wf-hand muted" style={{ fontSize: 13 }}>⌘+Enter to add · 3 pending</span>
        <Btn small primary>Add 3 teams</Btn>
      </div>
    </div>
  );
}

export function QuickAddRow() {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <Input box placeholder="Player 1" style={{ flex: 1 }} />
      <span className="muted" style={{ fontSize: 12 }}>+</span>
      <Input box placeholder="Player 2" style={{ flex: 1 }} />
      <Btn small>Add</Btn>
    </div>
  );
}

export function TournamentDetailView({ tournament }: { tournament: Tournament }) {
  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <DetailHeader tournament={tournament} />
        <DivisionDropdown tournamentSlug={tournament.slug} active={0} open={true} />
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 20,
          padding: "16px 24px 24px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div className="wf-serif" style={{ fontSize: 18 }}>Men&apos;s A · Roster</div>
              <span className="wf-hand muted" style={{ fontSize: 14 }}>16 teams · 32 players</span>
            </div>
            <Link
              href={`/t/${tournament.slug}/d/mens-a`}
              style={{ textDecoration: "none", color: "inherit", flex: 1 }}
            >
              <SketchBox fill="#faf7f2" style={{ padding: 0, height: "100%" }}>
                <RosterTable />
              </SketchBox>
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="wf-serif" style={{ fontSize: 18 }}>Add a team</div>
            <QuickAddRow />
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "Poppins",
              fontSize: 12,
              color: "var(--ink-muted)",
            }}>
              <div style={{ flex: 1, height: 1, borderTop: "1px dashed var(--line-soft)" }} />
              <span>or paste bulk</span>
              <div style={{ flex: 1, height: 1, borderTop: "1px dashed var(--line-soft)" }} />
            </div>
            <BulkAddBox compact />

            <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px dashed var(--line-soft)" }}>
              <div className="wf-serif" style={{ fontSize: 16, marginBottom: 8 }}>Format</div>
              <FormatSelector selected={0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyDivisionView({ tournament }: { tournament: Tournament }) {
  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <DetailHeader tournament={tournament} />
        <DivisionDropdown tournamentSlug={tournament.slug} active={0} />
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.3fr 1fr",
          gap: 20,
          padding: "20px 24px 24px",
        }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 18, marginBottom: 10 }}>Men&apos;s A · Roster</div>
            <div style={{
              height: "85%",
              border: "1.8px dashed var(--line-soft)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 30,
              textAlign: "center",
              gap: 12,
            }}>
              <svg width="80" height="40" viewBox="0 0 80 40" fill="none">
                <circle cx="20" cy="22" r="10" fill="none" stroke="#1f4d3a" strokeWidth="1.5" />
                <circle cx="40" cy="22" r="10" fill="none" stroke="#1f4d3a" strokeWidth="1.5" />
                <circle cx="60" cy="22" r="10" fill="none" stroke="#1f4d3a" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="40" y="8" fontFamily="Poppins" fontSize="11" fill="#1f4d3a" textAnchor="middle">doubles teams</text>
              </svg>
              <div className="wf-serif" style={{ fontSize: 18 }}>No teams yet</div>
              <div className="wf-hand muted" style={{ fontSize: 14, maxWidth: 260 }}>
                Add doubles pairs one at a time, or paste a list on the right →
              </div>
              <Btn primary small>+ Add first team</Btn>
            </div>
          </div>
          <div>
            <div className="wf-serif" style={{ fontSize: 18, marginBottom: 10 }}>Add teams</div>
            <QuickAddRow />
            <div style={{ height: 14 }} />
            <BulkAddBox />
          </div>
        </div>
      </div>
    </div>
  );
}
