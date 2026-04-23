"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { recordScore } from "@/app/lib/actions/recordScore";
import { swapBracketTeams } from "@/app/lib/actions/swapBracketTeams";
import type { MatchRow, TeamMap, MatchFormat, SetScore } from "./page";

type BracketPosition = 1 | 2;

type SwapTarget = {
  matchId: string;
  bracketSlot: number;
  round: string;
  position: BracketPosition;
  teamId: string | null;
};

// ─── Bracket layout helpers ───────────────────────────────────────────────────

function bracketSize(matches: MatchRow[]): number {
  const maxSlot = Math.max(...matches.map((m) => m.bracketSlot));
  let s = 1;
  while (s <= maxSlot / 2) s <<= 1;
  return s;
}

function groupByRound(matches: MatchRow[], size: number): MatchRow[][] {
  const totalRounds = Math.log2(size) + 1;
  const rounds: MatchRow[][] = [];
  for (let r = 0; r < totalRounds; r++) {
    const lo = r === 0 ? size : size >> r;
    const hi = lo * 2 - 1;
    const roundMatches = matches
      .filter((m) => m.bracketSlot >= lo && m.bracketSlot <= hi)
      .sort((a, b) => a.bracketSlot - b.bracketSlot);
    if (roundMatches.length > 0) rounds.push(roundMatches);
  }
  return rounds;
}

// ─── Match card ───────────────────────────────────────────────────────────────

const CARD_H = 112;
const CARD_W = 240;
const CARD_GAP = 16;

function SetBoxes({
  sets,
  team,
  maxSets,
}: {
  sets: SetScore[];
  team: 1 | 2;
  maxSets: number;
}) {
  const boxes: (number | null)[] = [];
  for (let i = 0; i < maxSets; i++) {
    const s = sets[i];
    if (!s) {
      boxes.push(null);
    } else {
      boxes.push(team === 1 ? s.team1 : s.team2);
    }
  }
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {boxes.map((v, i) => (
        <div
          key={i}
          style={{
            minWidth: 18,
            height: 20,
            padding: "0 4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            background: v == null ? "transparent" : "var(--paper-2)",
            borderRadius: 3,
            color: v == null ? "var(--ink-muted)" : "var(--ink)",
          }}
        >
          {v ?? ""}
        </div>
      ))}
    </div>
  );
}

function MatchCard({
  match,
  teamMap,
  top,
  matchFormat,
  swapMode,
  selectedSwapTarget,
  onSelectMatch,
  onSelectSwapTarget,
}: {
  match: MatchRow;
  teamMap: TeamMap;
  top: number;
  matchFormat: MatchFormat;
  swapMode: boolean;
  selectedSwapTarget: SwapTarget | null;
  onSelectMatch: (m: MatchRow) => void;
  onSelectSwapTarget: (target: SwapTarget) => void;
}) {
  const t1 = match.team1Id ? teamMap[match.team1Id] ?? "Unknown" : null;
  const t2 = match.team2Id ? teamMap[match.team2Id] ?? "Unknown" : null;
  const isEmpty = !t1 && !t2;
  const isTbd = !t1 || !t2;
  const w = match.winnerId;
  const maxSets = matchFormat === "ONE_SET" ? 1 : 3;

  return (
    <div style={{ position: "absolute", top, left: 0, width: CARD_W }}>
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          border: `1.5px solid ${isEmpty ? "var(--line-soft)" : "var(--paper-2)"}`,
          borderRadius: 8,
          background: "var(--paper)",
          cursor: isEmpty ? "default" : "pointer",
          overflow: "hidden",
          boxShadow: isEmpty ? "none" : "0 1px 3px rgba(0,0,0,.06)",
          opacity: isEmpty ? 0.45 : 1,
          transition: "box-shadow .15s",
        }}
      >
        {[
          { name: t1, id: match.team1Id, team: 1 as const, position: 1 as const },
          { name: t2, id: match.team2Id, team: 2 as const, position: 2 as const },
        ].map(({ name, id, team, position }, idx) => {
          const isSelected =
            selectedSwapTarget?.matchId === match.id && selectedSwapTarget.position === position;
          const canClick = !isEmpty;
          return (
            <div
              key={idx}
              onClick={() => {
                if (!canClick) return;
                if (swapMode) {
                  onSelectSwapTarget({
                    matchId: match.id,
                    bracketSlot: match.bracketSlot,
                    round: match.round,
                    position,
                    teamId: id ?? null,
                  });
                } else {
                  onSelectMatch(match);
                }
              }}
              style={{
                height: "50%",
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                borderBottom: idx === 0 ? "1px solid var(--paper-2)" : undefined,
                background: isSelected
                  ? "rgba(31,77,58,.14)"
                  : w && w === id
                    ? "rgba(31,77,58,.08)"
                    : undefined,
                fontSize: 13,
                fontWeight: w && w === id ? 600 : 400,
                color: name ? "var(--ink)" : "var(--ink-muted)",
                gap: 6,
                cursor: canClick ? "pointer" : "default",
                boxShadow: isSelected ? "inset 0 0 0 1.5px var(--green)" : undefined,
              }}
            >
              {w && w === id && (
                <span style={{ color: "var(--green)", fontSize: 11, alignSelf: "center" }}>✓</span>
              )}
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
                {name
                  ? name.split(" / ").map((player, pi) => (
                      <span key={pi} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                        {player}
                      </span>
                    ))
                  : <span style={{ fontSize: 13 }}>{isTbd ? "TBD" : ""}</span>
                }
              </div>
              {!isEmpty && <SetBoxes sets={match.sets} team={team} maxSets={maxSets} />}
            </div>
          );
        })}
      </div>
      {!isEmpty && match.scheduledTime && (
        <div
          className="muted"
          style={{ fontSize: 11, marginTop: 4, padding: "0 10px" }}
        >
          {formatScheduledTime(match.scheduledTime)}
        </div>
      )}
    </div>
  );
}

function formatScheduledTime(iso: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  const timeStr = m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  return `${dateStr} - ${timeStr}`;
}

// ─── Side drawer ──────────────────────────────────────────────────────────────

function ScoreDrawer({
  match,
  teamMap,
  matchFormat,
  divisionId,
  tournamentSlug,
  onClose,
}: {
  match: MatchRow;
  teamMap: TeamMap;
  matchFormat: MatchFormat;
  divisionId: string;
  tournamentSlug: string;
  onClose: () => void;
}) {
  const maxSets = matchFormat === "ONE_SET" ? 1 : 3;
  const initialSets: SetScore[] = Array.from({ length: maxSets }, (_, i) => ({
    team1: match.sets[i]?.team1 ?? 0,
    team2: match.sets[i]?.team2 ?? 0,
  }));
  const [sets, setSets] = useState<SetScore[]>(initialSets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const t1 = match.team1Id ? teamMap[match.team1Id] ?? "Team 1" : "—";
  const t2 = match.team2Id ? teamMap[match.team2Id] ?? "Team 2" : "—";

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  function updateSet(i: number, team: 1 | 2, value: string) {
    const n = Math.max(0, Math.min(99, parseInt(value) || 0));
    setSets((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [team === 1 ? "team1" : "team2"]: n } : s))
    );
  }

  // Derive winner locally for preview
  let team1Sets = 0;
  let team2Sets = 0;
  for (const s of sets) {
    if (s.team1 === 0 && s.team2 === 0) continue;
    if (s.team1 > s.team2) team1Sets++;
    else if (s.team2 > s.team1) team2Sets++;
  }
  const setsNeeded = matchFormat === "ONE_SET" ? 1 : 2;
  const previewWinner =
    team1Sets >= setsNeeded ? match.team1Id : team2Sets >= setsNeeded ? match.team2Id : null;

  async function handleSave() {
    setError("");
    setSaving(true);
    const result = await recordScore(match.id, sets, divisionId, tournamentSlug);
    setSaving(false);
    if (result?.error) { setError(result.error); return; }
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,.2)",
          zIndex: 99,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: 380,
          background: "var(--paper)",
          borderLeft: "1px solid var(--line-soft)",
          boxShadow: "-4px 0 24px rgba(0,0,0,.08)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--paper-2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 20 }}>Match Details</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{match.round}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 22, color: "var(--ink-muted)", lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Teams header */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <TeamRow
              name={t1}
              isWinner={previewWinner != null && previewWinner === match.team1Id}
            />
            <div className="muted" style={{ fontSize: 12, textAlign: "center", letterSpacing: ".1em" }}>VS</div>
            <TeamRow
              name={t2}
              isWinner={previewWinner != null && previewWinner === match.team2Id}
            />
          </div>

          {/* Score inputs */}
          <div>
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>
              {matchFormat === "ONE_SET" ? "Set score" : "Set scores"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sets.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="muted" style={{ fontSize: 12, width: 40 }}>
                    Set {i + 1}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={s.team1 || ""}
                    onChange={(e) => updateSet(i, 1, e.target.value)}
                    placeholder="–"
                    style={setInputStyle}
                  />
                  <span className="muted" style={{ fontSize: 14 }}>–</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={s.team2 || ""}
                    onChange={(e) => updateSet(i, 2, e.target.value)}
                    placeholder="–"
                    style={setInputStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ fontSize: 13, color: "#c0392b" }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--paper-2)",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}>
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
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 20px", fontSize: 13,
              fontFamily: "Poppins, sans-serif",
              background: "var(--green)", border: "none",
              borderRadius: 6, cursor: "pointer", color: "#fff", fontWeight: 600,
            }}
          >
            {saving ? "Saving…" : "Save score"}
          </button>
        </div>
      </div>
    </>
  );
}

function TeamRow({ name, isWinner }: { name: string; isWinner: boolean }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        border: `1.5px solid ${isWinner ? "var(--green)" : "var(--line-soft)"}`,
        borderRadius: 8,
        fontSize: 15,
        fontWeight: isWinner ? 600 : 400,
        color: isWinner ? "var(--green)" : "var(--ink)",
        background: isWinner ? "rgba(31,77,58,.06)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span>{name}</span>
      {isWinner && <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}>Winner</span>}
    </div>
  );
}

const setInputStyle: React.CSSProperties = {
  width: 56,
  padding: "8px 10px",
  fontFamily: "Poppins, sans-serif",
  fontSize: 14,
  textAlign: "center",
  border: "1px solid var(--line-soft)",
  borderRadius: 6,
  background: "var(--paper)",
  color: "var(--ink)",
  outline: "none",
};

// ─── Bracket view ─────────────────────────────────────────────────────────────

const ROUND_LABELS: Record<string, string> = {
  R1: "Round 1",
  R16: "Round of 16",
  QF: "Quarterfinals",
  SF: "Semifinals",
  Final: "Final",
  "B-R1": "Back Draw · Round 1",
  "B-R16": "Back Draw · R16",
  "B-QF": "Back Draw · QF",
  "B-SF": "Back Draw · SF",
  "B-Final": "Back Draw · Final",
};

function BracketTree({
  matches,
  teamMap,
  matchFormat,
  swapMode,
  selectedSwapTarget,
  onSelectMatch,
  onSelectSwapTarget,
}: {
  matches: MatchRow[];
  teamMap: TeamMap;
  matchFormat: MatchFormat;
  swapMode: boolean;
  selectedSwapTarget: SwapTarget | null;
  onSelectMatch: (m: MatchRow) => void;
  onSelectSwapTarget: (target: SwapTarget) => void;
}) {
  const size = bracketSize(matches);
  const rounds = groupByRound(matches, size);

  const yBySlot = new Map<number, number>();
  // Give every R1 slot a virtual y-position, whether or not a live match exists there
  // (byes leave some slots empty but the parent's midpoint still needs those coordinates).
  for (let i = 0; i < size; i++) {
    yBySlot.set(size + i, i * (CARD_H + CARD_GAP));
  }
  for (let ri = 1; ri < rounds.length; ri++) {
    for (const m of rounds[ri]) {
      const c1 = yBySlot.get(m.bracketSlot * 2);
      const c2 = yBySlot.get(m.bracketSlot * 2 + 1);
      const ys = [c1, c2].filter((v): v is number => v !== undefined);
      const y = ys.length === 2 ? (ys[0] + ys[1]) / 2 : ys[0] ?? 0;
      yBySlot.set(m.bracketSlot, y);
    }
  }

  const totalH = size * (CARD_H + CARD_GAP) - CARD_GAP;
  const CONNECTOR_W = 40;
  const liveSlots = new Set(matches.map((m) => m.bracketSlot));

  // Label height + gap above each round column — connectors need to line up with cards,
  // so we offset the SVG by this header height too.
  const HEADER_H = 11 + 4 + 8; // label fontSize + marginBottom + flex gap (see column below)

  return (
    <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content" }}>
      {rounds.map((roundMatches, ri) => {
        const label = ROUND_LABELS[roundMatches[0]?.round] ?? roundMatches[0]?.round;
        const nextRound = rounds[ri + 1];
        return (
          <Fragment key={ri}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                className="muted"
                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}
              >
                {label}
              </div>
              <div style={{ position: "relative", width: CARD_W, height: totalH }}>
                {roundMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    teamMap={teamMap}
                    top={yBySlot.get(m.bracketSlot) ?? 0}
                    matchFormat={matchFormat}
                    swapMode={swapMode}
                    selectedSwapTarget={selectedSwapTarget}
                    onSelectMatch={onSelectMatch}
                    onSelectSwapTarget={onSelectSwapTarget}
                  />
                ))}
              </div>
            </div>

            {nextRound && (
              <div style={{ width: CONNECTOR_W, paddingTop: HEADER_H, flexShrink: 0 }}>
                <svg
                  width={CONNECTOR_W}
                  height={totalH}
                  style={{ display: "block", overflow: "visible" }}
                >
                  {nextRound.map((parent) => {
                    const c1Slot = parent.bracketSlot * 2;
                    const c2Slot = parent.bracketSlot * 2 + 1;
                    const pY = yBySlot.get(parent.bracketSlot);
                    if (pY === undefined) return null;
                    const parentMid = pY + CARD_H / 2;
                    const midX = CONNECTOR_W / 2;
                    const segs: React.ReactNode[] = [];

                    const liveChildMids: number[] = [];
                    for (const cSlot of [c1Slot, c2Slot]) {
                      if (!liveSlots.has(cSlot)) continue;
                      const cY = yBySlot.get(cSlot);
                      if (cY === undefined) continue;
                      const childMid = cY + CARD_H / 2;
                      liveChildMids.push(childMid);
                      segs.push(
                        <line
                          key={`h-${parent.id}-${cSlot}`}
                          x1={0}
                          y1={childMid}
                          x2={midX}
                          y2={childMid}
                          stroke="var(--line-soft)"
                          strokeWidth={1.5}
                        />
                      );
                    }

                    if (liveChildMids.length > 0) {
                      const points = [...liveChildMids, parentMid];
                      const yTop = Math.min(...points);
                      const yBot = Math.max(...points);
                      if (yTop !== yBot) {
                        segs.push(
                          <line
                            key={`v-${parent.id}`}
                            x1={midX}
                            y1={yTop}
                            x2={midX}
                            y2={yBot}
                            stroke="var(--line-soft)"
                            strokeWidth={1.5}
                          />
                        );
                      }

                      segs.push(
                        <line
                          key={`p-${parent.id}`}
                          x1={midX}
                          y1={parentMid}
                          x2={CONNECTOR_W}
                          y2={parentMid}
                          stroke="var(--line-soft)"
                          strokeWidth={1.5}
                        />
                      );
                    }

                    return <g key={parent.id}>{segs}</g>;
                  })}
                </svg>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export function BracketView({
  matches,
  backMatches,
  teamMap,
  divisionId,
  tournamentSlug,
  matchFormat,
}: {
  matches: MatchRow[];
  backMatches: MatchRow[];
  teamMap: TeamMap;
  divisionId: string;
  tournamentSlug: string;
  matchFormat: MatchFormat;
}) {
  const [selected, setSelected] = useState<MatchRow | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState<SwapTarget | null>(null);
  const [swapError, setSwapError] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [tab, setTab] = useState<"main" | "back">("main");

  const allMatches = [...matches, ...backMatches];
  const currentSelected = selected ? allMatches.find((m) => m.id === selected.id) ?? null : null;
  const hasBackDraw = backMatches.length > 0;
  const visibleMatches = tab === "main" || !hasBackDraw ? matches : backMatches;
  const visibleTeamCount = new Set(
    visibleMatches.flatMap((match) => [match.team1Id, match.team2Id].filter((teamId): teamId is string => !!teamId))
  ).size;
  const swapEligibleSlotCount = visibleMatches.filter((match) => match.team1Id || match.team2Id).length * 2;

  function describeSwapTarget(target: SwapTarget | null): string {
    if (!target) return "None selected";
    const teamName = target.teamId ? (teamMap[target.teamId] ?? "Unknown team") : "TBD";
    return `${teamName} · ${target.round} slot ${target.bracketSlot} · ${target.position === 1 ? "Top" : "Bottom"}`;
  }

  async function handleSwapTargetSelect(target: SwapTarget) {
    if (!swapMode || swapping) return;

    setSwapError("");

    if (
      swapSelection &&
      swapSelection.matchId === target.matchId &&
      swapSelection.position === target.position
    ) {
      setSwapSelection(null);
      return;
    }

    if (!swapSelection) {
      setSwapSelection(target);
      return;
    }

    setSwapping(true);
    const result = await swapBracketTeams({
      divisionId,
      tournamentSlug,
      isConsolation: tab === "back" && hasBackDraw,
      sourceMatchId: swapSelection.matchId,
      sourcePosition: swapSelection.position,
      targetMatchId: target.matchId,
      targetPosition: target.position,
    });
    setSwapping(false);

    if (result?.error) {
      setSwapError(result.error);
      return;
    }

    setSwapSelection(null);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {(hasBackDraw || visibleTeamCount >= 1) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 32px 0", borderBottom: "1px solid var(--paper-2)" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {hasBackDraw && (["main", "back"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setSelected(null);
                  setSwapSelection(null);
                  setSwapError("");
                }}
                style={{
                  padding: "7px 16px",
                  fontSize: 13,
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: tab === t ? 600 : 400,
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${tab === t ? "var(--green)" : "transparent"}`,
                  borderRadius: 0,
                  cursor: "pointer",
                  color: tab === t ? "var(--ink)" : "var(--ink-muted)",
                  marginBottom: -1,
                }}
              >
                {t === "main" ? "Main Draw" : "Back Draw"}
              </button>
            ))}
          </div>
          {swapEligibleSlotCount >= 2 && (
            <button
              onClick={() => {
                setSelected(null);
                const nextSwapMode = !swapMode;
                setSwapMode(nextSwapMode);
                if (!nextSwapMode) {
                  setSwapSelection(null);
                  setSwapError("");
                }
              }}
              style={{
                marginBottom: 12,
                padding: "6px 14px",
                fontSize: 13,
                fontFamily: "Poppins, sans-serif",
                background: swapMode ? "rgba(31,77,58,.08)" : "none",
                border: `1px solid ${swapMode ? "var(--green)" : "var(--line-soft)"}`,
                borderRadius: 6,
                cursor: "pointer",
                color: swapMode ? "var(--green)" : "var(--ink-muted)",
              }}
            >
              {swapMode ? "Exit Swap Mode" : "Swap Teams"}
            </button>
          )}
        </div>
      )}

      {swapMode && (
        <div style={{
          padding: "12px 32px",
          borderBottom: "1px solid var(--paper-2)",
          background: "linear-gradient(180deg, rgba(31,77,58,.05), rgba(31,77,58,0))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 13, color: "var(--ink)" }}>
              Click one bracket side, then click another side to swap. `TBD` is allowed.
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              Selected: {describeSwapTarget(swapSelection)}
            </div>
            {swapError && <div style={{ fontSize: 12, color: "#c0392b" }}>{swapError}</div>}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-muted)", whiteSpace: "nowrap" }}>
            {swapping ? "Swapping…" : "Scores lock swaps"}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
        <BracketTree
          matches={visibleMatches}
          teamMap={teamMap}
          matchFormat={matchFormat}
          swapMode={swapMode}
          selectedSwapTarget={swapSelection}
          onSelectMatch={setSelected}
          onSelectSwapTarget={handleSwapTargetSelect}
        />
      </div>

      {currentSelected && (
        <ScoreDrawer
          match={currentSelected}
          teamMap={teamMap}
          matchFormat={matchFormat}
          divisionId={divisionId}
          tournamentSlug={tournamentSlug}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
