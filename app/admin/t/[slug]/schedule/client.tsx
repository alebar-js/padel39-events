"use client";

import { Fragment, useState, useCallback, useEffect } from "react";
import { assignMatchSlot } from "@/app/lib/actions/assignMatchSlot";
import { validateMatchSlot } from "@/app/lib/actions/validateMatchSlot";
import { slotsForDay, slotDateTime } from "@/app/lib/schedule";
import type { CourtRow, DayRow, DivisionRow, MatchRow } from "./page";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function fmtSlot(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

function courtsForDay(day: DayRow, allCourts: CourtRow[]): CourtRow[] {
  if (day.courtIds.length > 0) {
    return allCourts.filter((c) => day.courtIds.includes(c.id));
  }
  return allCourts;
}

function matchAtSlot(
  matches: MatchRow[],
  courtId: string,
  day: DayRow,
  slot: string
): MatchRow | undefined {
  const when = slotDateTime({ date: new Date(day.date) }, slot).toISOString();
  return matches.find((m) => m.courtId === courtId && m.scheduledTime === when);
}

function isScheduled(m: MatchRow): boolean {
  return m.courtId !== null && m.scheduledTime !== null;
}

const ROUND_ORDER: Record<string, number> = {
  R1: 1, R16: 2, QF: 3, SF: 4, Final: 5,
};

function roundRank(round: string): number {
  return ROUND_ORDER[round] ?? 99;
}

function sortForDrawer(a: MatchRow, b: MatchRow): number {
  const r = roundRank(a.round) - roundRank(b.round);
  if (r !== 0) return r;
  if (a.isConsolation !== b.isConsolation) return a.isConsolation ? 1 : -1;
  return (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0);
}

function matchLabel(m: MatchRow): string {
  const t1 = m.team1 ?? "TBD";
  const t2 = m.team2 ?? "TBD";
  return `${t1}\nvs\n${t2}`;
}

function matchSubLabel(m: MatchRow): string {
  const suffix = m.isConsolation ? " (Cons.)" : "";
  return `${m.divisionName} · ${m.round}${suffix}`;
}

// ─── Match chip in the grid cell ─────────────────────────────────────────────

function MatchChip({
  match,
  onClick,
}: {
  match: MatchRow;
  onClick: (m: MatchRow) => void;
}) {
  return (
    <div
      onClick={() => onClick(match)}
      style={{
        position: "absolute",
        inset: 2,
        background: "var(--green)",
        borderRadius: 5,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {[match.team1, match.team2].map((team, idx) => {
        const players = (team ?? "TBD").split(" / ");
        return (
          <div
            key={idx}
            style={{
              padding: idx === 0 ? "5px 7px 4px" : "4px 7px 14px",
              borderBottom: idx === 0 ? "1px solid rgba(250,247,242,0.2)" : undefined,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              flex: 1,
            }}
          >
            {players.map((p, pi) => (
              <span
                key={pi}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--paper)",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          bottom: 3,
          right: 6,
          fontSize: 9,
          color: "rgba(250,247,242,0.7)",
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textAlign: "right",
        }}
      >
        {matchSubLabel(match)}
      </div>
    </div>
  );
}

// ─── Grid ────────────────────────────────────────────────────────────────────

const ROW_H = 108;
const TIME_COL_W = 56;
const COURT_COL_W = 180;

function ScheduleGridDay({
  day,
  courts,
  matches,
  onCellClick,
  onMatchClick,
}: {
  day: DayRow;
  courts: CourtRow[];
  matches: MatchRow[];
  onCellClick: (courtId: string, slot: string, day: DayRow) => void;
  onMatchClick: (m: MatchRow) => void;
}) {
  const activeCourts = courtsForDay(day, courts);
  const slots = slotsForDay(day);

  if (activeCourts.length === 0 || slots.length === 0) {
    return (
      <div style={{ padding: 32, color: "var(--ink-muted)", fontSize: 14, textAlign: "center" }}>
        No courts or time slots configured for this day.
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${TIME_COL_W}px ${activeCourts.map(() => `${COURT_COL_W}px`).join(" ")}`,
          minWidth: TIME_COL_W + activeCourts.length * COURT_COL_W,
        }}
      >
        {/* Header row */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "var(--paper)",
            borderBottom: "1px solid var(--line-soft)",
            gridColumn: `1 / span ${activeCourts.length + 1}`,
            display: "grid",
            gridTemplateColumns: `${TIME_COL_W}px ${activeCourts.map(() => `${COURT_COL_W}px`).join(" ")}`,
          }}
        >
          <div style={{ 
            borderRight: "1px solid var(--paper-2)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
          </div>
          {activeCourts.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".07em",
                color: "var(--ink-muted)",
                borderRight: "1px solid var(--paper-2)",
                textAlign: "center",
              }}
            >
              {c.name}
            </div>
          ))}
        </div>

        {/* Slot rows */}
        {slots.map((slot) => (
          <Fragment key={`slot-${slot}`}>
            {/* Time label */}
            <div
              key={`time-${slot}`}
              style={{
                height: ROW_H,
                padding: "0 8px",
                display: "flex",
                alignItems: "flex-start",
                paddingTop: 8,
                fontSize: 11,
                color: "var(--ink-muted)",
                borderRight: "1px solid var(--paper-2)",
                borderBottom: "1px solid var(--paper-2)",
                flexShrink: 0,
              }}
            >
              {fmtSlot(slot)}
            </div>

            {/* Court cells */}
            {activeCourts.map((court) => {
              const match = matchAtSlot(matches, court.id, day, slot);
              return (
                <div
                  key={`${slot}-${court.id}`}
                  onClick={() => !match && onCellClick(court.id, slot, day)}
                  style={{
                    height: ROW_H,
                    position: "relative",
                    borderRight: "1px solid var(--paper-2)",
                    borderBottom: "1px solid var(--paper-2)",
                    cursor: match ? "default" : "pointer",
                    background: match ? "var(--green-tint)" : undefined,
                    transition: "background 120ms",
                  }}
                  onMouseEnter={(e) => {
                    if (!match) (e.currentTarget as HTMLDivElement).style.background = "var(--paper-2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!match) (e.currentTarget as HTMLDivElement).style.background = "";
                  }}
                >
                  {match && <MatchChip match={match} onClick={onMatchClick} />}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Assign drawer ────────────────────────────────────────────────────────────

function AssignDrawer({
  mode,
  match,
  allMatches,
  unscheduledMatches,
  divisions,
  courtId,
  slot,
  day,
  tournamentSlug,
  onClose,
}: {
  mode: "assign" | "detail";
  match: MatchRow | null;
  allMatches: MatchRow[];
  unscheduledMatches: MatchRow[];
  divisions: DivisionRow[];
  courtId: string | null;
  slot: string | null;
  day: DayRow | null;
  tournamentSlug: string;
  onClose: () => void;
}) {
  const firstDivisionWithUnscheduled =
    divisions.find((d) => unscheduledMatches.some((m) => m.divisionId === d.id))?.id ??
    divisions[0]?.id ??
    "";

  const [selectedMatchId, setSelectedMatchId] = useState<string>("");
  const [divisionFilterId, setDivisionFilterId] = useState<string>(firstDivisionWithUnscheduled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [previewing, setPreviewing] = useState(false);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Reset on open
  useEffect(() => {
    setSelectedMatchId("");
    setDivisionFilterId(firstDivisionWithUnscheduled);
    setError("");
    setPreviewErrors([]);
  }, [courtId, slot, match, firstDivisionWithUnscheduled]);

  // Preview validation whenever a match is selected
  useEffect(() => {
    if (!selectedMatchId || !courtId || !slot || !day) {
      setPreviewErrors([]);
      return;
    }
    let cancelled = false;
    setPreviewing(true);
    const when = slotDateTime({ date: new Date(day.date) }, slot).toISOString();
    validateMatchSlot(selectedMatchId, courtId, when).then(({ errors }) => {
      if (!cancelled) {
        setPreviewErrors(errors);
        setPreviewing(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedMatchId, courtId, slot, day]);

  async function handleAssign() {
    if (!selectedMatchId || !courtId || !slot || !day) return;
    setSaving(true);
    setError("");
    const when = slotDateTime({ date: new Date(day.date) }, slot).toISOString();
    const result = await assignMatchSlot(selectedMatchId, courtId, when, tournamentSlug);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onClose();
  }

  async function handleUnassign() {
    if (!match) return;
    setSaving(true);
    setError("");
    const result = await assignMatchSlot(match.id, null, null, tournamentSlug);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onClose();
  }

  const isDetail = mode === "detail" && match;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", zIndex: 99 }}
      />
      <div
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: 360,
          background: "var(--paper)",
          borderLeft: "1px solid var(--line-soft)",
          boxShadow: "-4px 0 24px rgba(0,0,0,.08)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--paper-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div className="wf-serif" style={{ fontSize: 20 }}>
              {isDetail ? "Scheduled Match" : "Assign Match"}
            </div>
            {slot && day && (
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {fmtDate(day.date)} · {fmtSlot(slot)}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ink-muted)", padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {isDetail ? (
            <>
              {/* Match detail */}
              <div
                style={{
                  padding: "14px 16px",
                  border: "1.5px solid var(--green)",
                  borderRadius: 8,
                  background: "var(--green-tint)",
                  position: "relative",
                }}
              >
                <div style={{ 
                  fontSize: 14, 
                  fontWeight: 600, 
                  color: "var(--ink)",
                  whiteSpace: "pre-line",
                  lineHeight: 1.3,
                  textAlign: "center",
                }}>
                  {matchLabel(match)}
                </div>
                <div 
                  className="muted" 
                  style={{ 
                    position: "absolute",
                    bottom: 8,
                    right: 16,
                    fontSize: 10,
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "right",
                  }}
                >
                  {matchSubLabel(match)}
                </div>
              </div>
              <button
                onClick={handleUnassign}
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  fontSize: 13,
                  fontFamily: "Poppins, sans-serif",
                  background: "none",
                  border: "1px solid var(--accent-orange)",
                  borderRadius: 6,
                  cursor: "pointer",
                  color: "var(--accent-orange)",
                  alignSelf: "flex-start",
                }}
              >
                {saving ? "Removing…" : "Remove from slot"}
              </button>
            </>
          ) : (
            <>
              {unscheduledMatches.length === 0 ? (
                <div className="muted" style={{ fontSize: 14 }}>All matches are scheduled.</div>
              ) : (
                <>
                  {/* Division filter */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>
                      Division
                    </div>
                    {divisions.length > 1 ? (
                      <select
                        value={divisionFilterId}
                        onChange={(e) => {
                          setDivisionFilterId(e.target.value);
                          setSelectedMatchId("");
                        }}
                        style={{
                          padding: "9px 12px",
                          fontFamily: "Poppins, sans-serif",
                          fontSize: 14,
                          color: "var(--ink)",
                          background: "var(--paper)",
                          border: "1px solid var(--line-soft)",
                          borderRadius: 6,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {divisions.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ fontSize: 14, color: "var(--ink)" }}>
                        {divisions[0]?.name ?? "—"}
                      </div>
                    )}
                  </div>

                  {/* Filtered match list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".07em" }}>
                      Unscheduled matches
                    </div>
                    {(() => {
                      const filtered = unscheduledMatches
                        .filter((m) => m.divisionId === divisionFilterId)
                        .sort(sortForDrawer);
                      const activeDivision = divisions.find((d) => d.id === divisionFilterId);
                      const divisionHasAnyMatches = allMatches.some((m) => m.divisionId === divisionFilterId);
                      if (filtered.length === 0 && activeDivision && !divisionHasAnyMatches) {
                        const isGroup = activeDivision.format === "GROUP_PLAYOFF";
                        const bracketUrl = `/admin/t/${activeDivision.slug}/d/${activeDivision.id}/${isGroup ? "groups" : "bracket"}`;
                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div className="muted" style={{ fontSize: 13 }}>
                              {isGroup ? "Groups have" : "The bracket has"} not been generated for this division yet.
                            </div>
                            <a
                              href={bracketUrl}
                              style={{
                                display: "inline-block",
                                padding: "8px 16px",
                                fontSize: 13,
                                fontFamily: "Poppins, sans-serif",
                                fontWeight: 600,
                                background: "var(--green)",
                                color: "#fff",
                                borderRadius: 6,
                                textDecoration: "none",
                                textAlign: "center",
                              }}
                            >
                              {isGroup ? "Generate Groups" : "Generate Bracket"} →
                            </a>
                          </div>
                        );
                      }
                      if (filtered.length === 0) {
                        return (
                          <div className="muted" style={{ fontSize: 13 }}>
                            All matches in this division are scheduled.
                          </div>
                        );
                      }
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {filtered.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => setSelectedMatchId(m.id)}
                              style={{
                                border: `1.5px solid ${selectedMatchId === m.id ? "var(--green)" : "var(--line-soft)"}`,
                                borderRadius: 7,
                                cursor: "pointer",
                                background: selectedMatchId === m.id ? "var(--green-tint)" : "var(--paper)",
                                transition: "border-color 120ms, background 120ms",
                                overflow: "hidden",
                                position: "relative",
                              }}
                            >
                              {[m.team1, m.team2].map((team, idx) => {
                                const players = (team ?? "TBD").split(" / ");
                                return (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: idx === 1 ? "10px 14px 20px" : "10px 14px",
                                      borderBottom: idx === 0 ? `1px solid ${selectedMatchId === m.id ? "rgba(31,77,58,.15)" : "var(--paper-2)"}` : undefined,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 2,
                                    }}
                                  >
                                    {players.map((p, pi) => (
                                      <span key={pi} style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.3 }}>
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })}
                              <div
                                className="muted"
                                style={{
                                  position: "absolute",
                                  bottom: 5,
                                  right: 14,
                                  fontSize: 11,
                                  lineHeight: 1.2,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {matchSubLabel(m)}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </>
          )}

          {previewErrors.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {previewErrors.map((e, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: "var(--accent-orange)",
                    padding: "8px 12px",
                    background: "rgba(var(--accent-orange-rgb, 220,100,40),.08)",
                    borderRadius: 6,
                    border: "1px solid rgba(var(--accent-orange-rgb, 220,100,40),.25)",
                  }}
                >
                  {e}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: "var(--accent-orange)" }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        {!isDetail && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--paper-2)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "8px 18px", fontSize: 13,
                fontFamily: "Poppins, sans-serif",
                background: "none", border: "1px solid var(--line-soft)",
                borderRadius: 6, cursor: "pointer", color: "var(--ink-muted)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={saving || !selectedMatchId || previewing || previewErrors.length > 0}
              style={{
                padding: "8px 20px", fontSize: 13,
                fontFamily: "Poppins, sans-serif",
                background: selectedMatchId && previewErrors.length === 0 ? "var(--green)" : "var(--paper-2)",
                border: "none",
                borderRadius: 6,
                cursor: selectedMatchId && previewErrors.length === 0 ? "pointer" : "default",
                color: selectedMatchId && previewErrors.length === 0 ? "#fff" : "var(--ink-muted)",
                fontWeight: 600,
                transition: "background 120ms",
              }}
            >
              {saving ? "Assigning…" : previewing ? "Checking…" : "Assign"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Unscheduled panel ────────────────────────────────────────────────────────

function UnscheduledPanel({ matches }: { matches: MatchRow[] }) {
  const [open, setOpen] = useState(true);
  if (matches.length === 0) return null;
  return (
    <div
      style={{
        borderTop: "1px solid var(--paper-2)",
        flexShrink: 0,
        maxHeight: open ? 180 : 40,
        overflow: "hidden",
        transition: "max-height 200ms ease",
        background: "var(--paper)",
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 20px",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".07em",
          color: "var(--ink-muted)",
          userSelect: "none",
        }}
      >
        <span>{open ? "▾" : "▸"}</span>
        Unscheduled ({matches.length})
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "0 20px 12px",
          overflowY: "auto",
          maxHeight: 130,
        }}
      >
        {matches.map((m) => (
          <div
            key={m.id}
            title={matchLabel(m)}
            style={{
              padding: "4px 10px",
              border: "1px dashed var(--line-dashed)",
              borderRadius: 5,
              fontSize: 11,
              color: "var(--ink-muted)",
              whiteSpace: "nowrap",
              maxWidth: 220,
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {m.divisionName} · {m.round}{m.isConsolation ? " (C)" : ""} — {m.team1 ?? "TBD"} / {m.team2 ?? "TBD"}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

type DrawerState =
  | { kind: "closed" }
  | { kind: "assign"; courtId: string; slot: string; day: DayRow }
  | { kind: "detail"; match: MatchRow; slot: string; day: DayRow };

export function ScheduleGrid({
  courts,
  days,
  matches,
  divisions,
  tournamentSlug,
  onConfigure,
}: {
  courts: CourtRow[];
  days: DayRow[];
  matches: MatchRow[];
  divisions: DivisionRow[];
  tournamentSlug: string;
  onConfigure: () => void;
}) {
  const [activeDayId, setActiveDayId] = useState<string>(days[0]?.id ?? "");
  const [drawer, setDrawer] = useState<DrawerState>({ kind: "closed" });

  const activeDay = days.find((d) => d.id === activeDayId) ?? days[0];
  const unscheduled = matches.filter((m) => !isScheduled(m));

  function handleCellClick(courtId: string, slot: string, day: DayRow) {
    setDrawer({ kind: "assign", courtId, slot, day });
  }

  function handleMatchClick(m: MatchRow) {
    if (!m.scheduledTime || !activeDay) return;
    const slotDate = new Date(m.scheduledTime);
    const hhmm = `${String(slotDate.getUTCHours()).padStart(2, "0")}:${String(slotDate.getUTCMinutes()).padStart(2, "0")}`;
    const day = days.find((d) => {
      const dd = new Date(d.date);
      return dd.toISOString().slice(0, 10) === slotDate.toISOString().slice(0, 10);
    }) ?? activeDay;
    setDrawer({ kind: "detail", match: m, slot: hhmm, day });
  }

  if (days.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="muted" style={{ fontSize: 14 }}>No tournament days configured.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Day tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--paper-2)",
          padding: "0 20px",
          gap: 4,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          {days.map((d) => {
            const active = d.id === activeDayId;
            return (
              <button
                key={d.id}
                onClick={() => setActiveDayId(d.id)}
                className={active ? "wf-tab wf-tab-active" : "wf-tab"}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                {fmtDate(d.date)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid for active day */}
      {activeDay && (
        <ScheduleGridDay
          day={activeDay}
          courts={courts}
          matches={matches}
          onCellClick={handleCellClick}
          onMatchClick={handleMatchClick}
        />
      )}

      {/* Unscheduled strip */}
      <UnscheduledPanel matches={unscheduled} />

      {/* Drawer */}
      {drawer.kind !== "closed" && (
        <AssignDrawer
          mode={drawer.kind === "detail" ? "detail" : "assign"}
          match={drawer.kind === "detail" ? drawer.match : null}
          allMatches={matches}
          unscheduledMatches={unscheduled}
          divisions={divisions}
          courtId={drawer.kind === "assign" ? drawer.courtId : drawer.match.courtId}
          slot={drawer.slot}
          day={drawer.day}
          tournamentSlug={tournamentSlug}
          onClose={() => setDrawer({ kind: "closed" })}
        />
      )}
    </div>
  );
}
