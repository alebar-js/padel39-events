"use client";

import { Fragment, useState } from "react";
import type { MatchFormat, MatchRow, SetScore, TeamMap } from "./page";

const CARD_H = 112;
const CARD_W = 240;
const CARD_GAP = 16;
const CONNECTOR_W = 40;
const HEADER_H = 11 + 4 + 8;

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

function bracketSize(matches: MatchRow[]): number {
  const maxSlot = Math.max(...matches.map((match) => match.bracketSlot));
  let size = 1;
  while (size <= maxSlot / 2) size <<= 1;
  return size;
}

function groupByRound(matches: MatchRow[], size: number): MatchRow[][] {
  const totalRounds = Math.log2(size) + 1;
  const rounds: MatchRow[][] = [];
  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
    const low = roundIndex === 0 ? size : size >> roundIndex;
    const high = low * 2 - 1;
    const roundMatches = matches
      .filter((match) => match.bracketSlot >= low && match.bracketSlot <= high)
      .sort((a, b) => a.bracketSlot - b.bracketSlot);
    if (roundMatches.length > 0) {
      rounds.push(roundMatches);
    }
  }
  return rounds;
}

function formatScheduledTime(iso: string): string {
  const date = new Date(iso);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours < 12 ? "am" : "pm";
  const hours12 = hours % 12 || 12;
  const timeStr =
    minutes === 0
      ? `${hours12}:00 ${ampm}`
      : `${hours12}:${String(minutes).padStart(2, "0")} ${ampm}`;
  return `${dateStr} - ${timeStr}`;
}

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
  for (let index = 0; index < maxSets; index++) {
    const set = sets[index];
    boxes.push(set ? (team === 1 ? set.team1 : set.team2) : null);
  }

  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {boxes.map((value, index) => (
        <div
          key={index}
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
            background: value == null ? "transparent" : "var(--paper-2)",
            borderRadius: 3,
            color: value == null ? "var(--ink-muted)" : "var(--ink)",
          }}
        >
          {value ?? ""}
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
  onSelect,
}: {
  match: MatchRow;
  teamMap: TeamMap;
  top: number;
  matchFormat: MatchFormat;
  onSelect: (match: MatchRow) => void;
}) {
  const team1 = match.team1Id ? teamMap[match.team1Id] ?? "Unknown" : null;
  const team2 = match.team2Id ? teamMap[match.team2Id] ?? "Unknown" : null;
  const isEmpty = !team1 && !team2;
  const isTbd = !team1 || !team2;
  const winnerId = match.winnerId;
  const maxSets = matchFormat === "ONE_SET" ? 1 : 3;

  return (
    <div style={{ position: "absolute", top, left: 0, width: CARD_W }}>
      <div
        onClick={() => {
          if (!isEmpty) onSelect(match);
        }}
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
        }}
      >
        {[
          { id: match.team1Id, name: team1, team: 1 as const },
          { id: match.team2Id, name: team2, team: 2 as const },
        ].map(({ id, name, team }, index) => (
          <div
            key={index}
            style={{
              height: "50%",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              borderBottom: index === 0 ? "1px solid var(--paper-2)" : undefined,
              background: winnerId && winnerId === id ? "rgba(31,77,58,.08)" : undefined,
              fontSize: 13,
              fontWeight: winnerId && winnerId === id ? 600 : 400,
              color: name ? "var(--ink)" : "var(--ink-muted)",
              gap: 6,
            }}
          >
            {winnerId && winnerId === id && (
              <span style={{ color: "var(--green)", fontSize: 11, alignSelf: "center" }}>✓</span>
            )}
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
              {name ? (
                name.split(" / ").map((player, playerIndex) => (
                  <span
                    key={playerIndex}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 13,
                    }}
                  >
                    {player}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 13 }}>{isTbd ? "TBD" : ""}</span>
              )}
            </div>
            {!isEmpty && <SetBoxes sets={match.sets} team={team} maxSets={maxSets} />}
          </div>
        ))}
      </div>
      {!isEmpty && match.scheduledTime && (
        <div className="muted" style={{ fontSize: 11, marginTop: 4, padding: "0 10px" }}>
          {formatScheduledTime(match.scheduledTime)}
        </div>
      )}
    </div>
  );
}

function MatchDrawer({
  match,
  teamMap,
  matchFormat,
  onClose,
}: {
  match: MatchRow;
  teamMap: TeamMap;
  matchFormat: MatchFormat;
  onClose: () => void;
}) {
  const team1 = match.team1Id ? teamMap[match.team1Id] ?? "Team 1" : "TBD";
  const team2 = match.team2Id ? teamMap[match.team2Id] ?? "Team 2" : "TBD";
  const maxSets = matchFormat === "ONE_SET" ? 1 : 3;
  const sets = Array.from({ length: maxSets }, (_, index) => ({
    team1: match.sets[index]?.team1 ?? null,
    team2: match.sets[index]?.team2 ?? null,
  }));

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.2)",
          zIndex: 99,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
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
              Match Details
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {match.round}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "var(--ink-muted)",
              lineHeight: 1,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[team1, team2].map((teamName, index) => {
              const teamId = index === 0 ? match.team1Id : match.team2Id;
              const isWinner = match.winnerId != null && match.winnerId === teamId;
              return (
                <div
                  key={index}
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
                  <span>{teamName}</span>
                  {isWinner && (
                    <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Winner
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <div
              className="muted"
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 10,
              }}
            >
              {matchFormat === "ONE_SET" ? "Set score" : "Set scores"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sets.map((set, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="muted" style={{ fontSize: 12, width: 40 }}>
                    Set {index + 1}
                  </div>
                  <div style={drawerScoreStyle}>{set.team1 ?? "—"}</div>
                  <span className="muted" style={{ fontSize: 14 }}>
                    –
                  </span>
                  <div style={drawerScoreStyle}>{set.team2 ?? "—"}</div>
                </div>
              ))}
            </div>
          </div>

          {match.scheduledTime && (
            <div>
              <div
                className="muted"
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 8,
                }}
              >
                Scheduled
              </div>
              <div style={{ fontSize: 15 }}>{formatScheduledTime(match.scheduledTime)}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const drawerScoreStyle: React.CSSProperties = {
  width: 56,
  padding: "8px 10px",
  fontFamily: "Poppins, sans-serif",
  fontSize: 14,
  textAlign: "center",
  border: "1px solid var(--line-soft)",
  borderRadius: 6,
  background: "var(--paper)",
  color: "var(--ink)",
};

function BracketTree({
  matches,
  teamMap,
  matchFormat,
  onSelect,
}: {
  matches: MatchRow[];
  teamMap: TeamMap;
  matchFormat: MatchFormat;
  onSelect: (match: MatchRow) => void;
}) {
  const size = bracketSize(matches);
  const rounds = groupByRound(matches, size);
  const yBySlot = new Map<number, number>();

  for (let index = 0; index < size; index++) {
    yBySlot.set(size + index, index * (CARD_H + CARD_GAP));
  }

  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex++) {
    for (const match of rounds[roundIndex]) {
      const child1 = yBySlot.get(match.bracketSlot * 2);
      const child2 = yBySlot.get(match.bracketSlot * 2 + 1);
      const positions = [child1, child2].filter((value): value is number => value !== undefined);
      yBySlot.set(match.bracketSlot, positions.length === 2 ? (positions[0] + positions[1]) / 2 : positions[0] ?? 0);
    }
  }

  const totalHeight = size * (CARD_H + CARD_GAP) - CARD_GAP;
  const liveSlots = new Set(matches.map((match) => match.bracketSlot));

  return (
    <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content" }}>
      {rounds.map((roundMatches, roundIndex) => {
        const label = ROUND_LABELS[roundMatches[0]?.round] ?? roundMatches[0]?.round;
        const nextRound = rounds[roundIndex + 1];

        return (
          <Fragment key={roundIndex}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                className="muted"
                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}
              >
                {label}
              </div>
              <div style={{ position: "relative", width: CARD_W, height: totalHeight }}>
                {roundMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    teamMap={teamMap}
                    top={yBySlot.get(match.bracketSlot) ?? 0}
                    matchFormat={matchFormat}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>

            {nextRound && (
              <div style={{ width: CONNECTOR_W, paddingTop: HEADER_H, flexShrink: 0 }}>
                <svg width={CONNECTOR_W} height={totalHeight} style={{ display: "block", overflow: "visible" }}>
                  {nextRound.map((parent) => {
                    const childSlots = [parent.bracketSlot * 2, parent.bracketSlot * 2 + 1];
                    const parentY = yBySlot.get(parent.bracketSlot);
                    if (parentY === undefined) {
                      return null;
                    }

                    const parentMid = parentY + CARD_H / 2;
                    const midX = CONNECTOR_W / 2;
                    const segments: React.ReactNode[] = [];
                    const childMids: number[] = [];

                    for (const childSlot of childSlots) {
                      if (!liveSlots.has(childSlot)) {
                        continue;
                      }

                      const childY = yBySlot.get(childSlot);
                      if (childY === undefined) {
                        continue;
                      }

                      const childMid = childY + CARD_H / 2;
                      childMids.push(childMid);
                      segments.push(
                        <line
                          key={`h-${parent.id}-${childSlot}`}
                          x1={0}
                          y1={childMid}
                          x2={midX}
                          y2={childMid}
                          stroke="var(--line-soft)"
                          strokeWidth={1.5}
                        />
                      );
                    }

                    if (childMids.length > 0) {
                      const points = [...childMids, parentMid];
                      const top = Math.min(...points);
                      const bottom = Math.max(...points);

                      if (top !== bottom) {
                        segments.push(
                          <line
                            key={`v-${parent.id}`}
                            x1={midX}
                            y1={top}
                            x2={midX}
                            y2={bottom}
                            stroke="var(--line-soft)"
                            strokeWidth={1.5}
                          />
                        );
                      }

                      segments.push(
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

                    return <g key={parent.id}>{segments}</g>;
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

export function PublicBracketView({
  matches,
  backMatches,
  teamMap,
  matchFormat,
}: {
  matches: MatchRow[];
  backMatches: MatchRow[];
  teamMap: TeamMap;
  matchFormat: MatchFormat;
}) {
  const [tab, setTab] = useState<"main" | "back">("main");
  const [selected, setSelected] = useState<MatchRow | null>(null);
  const allMatches = [...matches, ...backMatches];
  const activeMatch = selected ? allMatches.find((match) => match.id === selected.id) ?? null : null;
  const hasBackDraw = backMatches.length > 0;
  const visibleMatches = tab === "back" && hasBackDraw ? backMatches : matches;
  const visibleTeamCount = new Set(
    visibleMatches.flatMap((match) =>
      [match.team1Id, match.team2Id].filter((teamId): teamId is string => !!teamId)
    )
  ).size;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {(hasBackDraw || visibleTeamCount >= 1) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 32px 0",
            borderBottom: "1px solid var(--paper-2)",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {hasBackDraw &&
              (["main", "back"] as const).map((nextTab) => (
                <button
                  key={nextTab}
                  onClick={() => {
                    setTab(nextTab);
                    setSelected(null);
                  }}
                  style={{
                    padding: "7px 16px",
                    fontSize: 13,
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: tab === nextTab ? 600 : 400,
                    background: "none",
                    border: "none",
                    borderBottom: `2px solid ${tab === nextTab ? "var(--green)" : "transparent"}`,
                    borderRadius: 0,
                    cursor: "pointer",
                    color: tab === nextTab ? "var(--ink)" : "var(--ink-muted)",
                    marginBottom: -1,
                  }}
                >
                  {nextTab === "main" ? "Main Draw" : "Back Draw"}
                </button>
              ))}
          </div>
          <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            {visibleTeamCount} active team{visibleTeamCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: "auto", padding: "20px 32px 32px" }}>
        <BracketTree
          matches={visibleMatches}
          teamMap={teamMap}
          matchFormat={matchFormat}
          onSelect={setSelected}
        />
      </div>

      {activeMatch && (
        <MatchDrawer
          match={activeMatch}
          teamMap={teamMap}
          matchFormat={matchFormat}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
