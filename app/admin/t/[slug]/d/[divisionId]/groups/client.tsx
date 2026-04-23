"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { recordScore } from "@/app/lib/actions/recordScore";
import { advanceToPlayoffs, isGroupStageComplete } from "@/app/lib/actions/advanceToPlayoffs";
import { SidebarNav } from "@/app/components/chrome";
import type { GroupRow, MatchRow, TeamMap, MatchFormat, SetScore } from "./page";

// Input styles for the drawer
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

// Team row component for drawer
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

// Score drawer component
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

  const t1 = match.team1Id ? teamMap[match.team1Id] ?? "Team 1" : "Team 1";
  const t2 = match.team2Id ? teamMap[match.team2Id] ?? "Team 2" : "Team 2";

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
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Group Stage Match</div>
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
                    placeholder="0"
                    style={setInputStyle}
                  />
                  <span className="muted" style={{ fontSize: 14 }}>-</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    value={s.team2 || ""}
                    onChange={(e) => updateSet(i, 2, e.target.value)}
                    placeholder="0"
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
            {saving ? "Saving..." : "Save score"}
          </button>
        </div>
      </div>
    </>
  );
}

// Calculate group standings
function calculateGroupStandings(teams: string[], matches: MatchRow[], teamMap: TeamMap, matchFormat: MatchFormat) {
  const standings: Record<string, {
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    lost: number;
    points: number;
    setsFor: number;
    setsAgainst: number;
  }> = {};

  // Initialize all teams
  for (const teamId of teams) {
    standings[teamId] = {
      teamId,
      teamName: teamMap[teamId] || "Unknown Team",
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      setsFor: 0,
      setsAgainst: 0,
    };
  }

  // Process matches
  for (const match of matches) {
    if (!match.winnerId || !match.team1Id || !match.team2Id) continue;

    const team1 = standings[match.team1Id];
    const team2 = standings[match.team2Id];

    if (!team1 || !team2) continue;

    // Update games played
    team1.played++;
    team2.played++;

    // Update winner/loser
    if (match.winnerId === match.team1Id) {
      team1.won++;
      team1.points += 2;
      team2.lost++;
      team2.points += 1;
    } else {
      team2.won++;
      team2.points += 2;
      team1.lost++;
      team1.points += 1;
    }

    // Update set counts, with different logic for best-of-1 vs best-of-3
    for (const set of match.sets) {
      let isSuperTieBreak = false;
      
      if (matchFormat === "BEST_OF_3") {
        // In best-of-3: third set > 7 = super tie-breaker (exclude from Games +/-)
        isSuperTieBreak = set.team1 > 7 || set.team2 > 7;
      }
      // In best-of-1: single set can go to 8+ (super set) - always include in Games +/-
      
      if (!isSuperTieBreak) {
        team1.setsFor += set.team1;
        team1.setsAgainst += set.team2;
        team2.setsFor += set.team2;
        team2.setsAgainst += set.team1;
      }
    }
  }

  // Sort by points, then set differential
  const sortedStandings = Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.setsFor - a.setsAgainst;
    const bDiff = b.setsFor - b.setsAgainst;
    return bDiff - aDiff;
  });

  return sortedStandings;
}

function formatSchedule(scheduledTime: string): { date: string; time: string } {
  const d = new Date(scheduledTime);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).toLowerCase();
  return { date, time };
}

// Match cell component for matrix
function MatchCell({
  match,
  teamMap,
  matchFormat,
  onSelect,
  rowTeamId,
  isDiagonal,
}: {
  match: MatchRow | null;
  teamMap: TeamMap;
  matchFormat: MatchFormat;
  onSelect: (match: MatchRow) => void;
  rowTeamId: string;
  isDiagonal: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const hasScore =
    match != null &&
    match.sets.length > 0 &&
    match.sets.some((s) => s.team1 > 0 || s.team2 > 0);

  const schedule = match?.scheduledTime ? formatSchedule(match.scheduledTime) : null;

  if (isDiagonal) {
    return (
      <div
        style={{
          width: 90,
          height: 72,
          background: "var(--paper-2)",
          border: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          color: "var(--ink-muted)",
        }}
      >
        -
      </div>
    );
  }

  const handleCellClick = () => {
    if (match) {
      onSelect(match);
    }
  };

  const isRowTeam1 = match?.team1Id != null && match.team1Id === rowTeamId;
  const isRowTeam2 = match?.team2Id != null && match.team2Id === rowTeamId;
  const rowIsWinner =
    match?.winnerId != null && (match.winnerId === rowTeamId);

  const setLines =
    match && hasScore && (isRowTeam1 || isRowTeam2)
      ? match.sets
          .filter((s) => s.team1 > 0 || s.team2 > 0)
          .map((s) => {
            const row = isRowTeam1 ? s.team1 : s.team2;
            const opp = isRowTeam1 ? s.team2 : s.team1;
            return `${row}-${opp}`;
          })
      : [];

  return (
    <div
      style={{
        width: 90,
        height: 72,
        border: "1px solid var(--line-soft)",
        background: match?.winnerId ? "var(--paper-1)" : "white",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={handleCellClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {match && hasScore && setLines.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              lineHeight: 1.1,
              fontWeight: rowIsWinner ? 600 : 400,
              color: rowIsWinner ? "var(--green)" : "inherit",
              gap: 3,
            }}
          >
            {setLines.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        ) : schedule ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              padding: "0 4px",
            }}
          >
            <div style={{ fontSize: 10, color: "var(--ink-muted)", textAlign: "center", lineHeight: 1.2 }}>
              {schedule.date}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", textAlign: "center" }}>
              {schedule.time}
            </div>
          </div>
        ) : (
          isHovered && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ opacity: 0.5 }}
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          )
        )}
      </div>
    </div>
  );
}

// Group component
function GroupCard({
  group,
  teamMap,
  matchFormat,
  divisionId,
  tournamentSlug,
  onScoreSaved,
}: {
  group: GroupRow;
  teamMap: TeamMap;
  matchFormat: MatchFormat;
  divisionId: string;
  tournamentSlug: string;
  onScoreSaved: () => void;
}) {
  const [selectedMatch, setSelectedMatch] = useState<MatchRow | null>(null);
  const standings = calculateGroupStandings(group.teams, group.matches, teamMap, matchFormat);
  const orderedTeamIds = standings.map((s) => s.teamId);

  // Create match lookup map
  const matchMap = new Map<string, MatchRow>();
  for (const match of group.matches) {
    if (match.team1Id && match.team2Id) {
      const key = `${match.team1Id}-${match.team2Id}`;
      const reverseKey = `${match.team2Id}-${match.team1Id}`;
      matchMap.set(key, match);
      matchMap.set(reverseKey, match);
    }
  }

  return (
    <div style={{
      border: "1px solid var(--line-soft)",
      borderRadius: 12,
      padding: 16,
      width: "fit-content",
      minWidth: "auto",
    }}>
      <div style={{
        fontSize: 18,
        fontWeight: 600,
        marginBottom: 16,
        paddingBottom: 8,
        borderBottom: "1px solid var(--line-soft)",
      }}>
        Group {group.name}
      </div>

      {/* Combined Standings + Match Matrix */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Group Standings & Matches</div>
        <div style={{ fontSize: 12, color: "var(--ink-muted)", marginBottom: 12 }}>
          2 pts per win, 1 pt per loss. Click any match cell to edit score.
        </div>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--line-soft)" }}>
                <th style={{ 
                  width: 40, 
                  height: 60, 
                  padding: "4px 4px", 
                  border: "1px solid var(--line-soft)", 
                  background: "var(--paper-2)",
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  #
                </th>
                <th style={{ 
                  width: 120, 
                  height: 60, 
                  padding: "4px 8px", 
                  border: "1px solid var(--line-soft)", 
                  background: "var(--paper-2)",
                  fontSize: 11,
                  fontWeight: 600,
                  textAlign: "left"
                }}>
                  Participants
                </th>
                {orderedTeamIds.map((teamId, colIndex) => (
                  <th key={teamId} style={{
                    width: 90,
                    height: 60,
                    padding: "4px 1px",
                    border: "1px solid var(--line-soft)",
                    background: "var(--paper-2)",
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                    fontSize: 8,
                    fontWeight: 600
                  }}>
                    {teamMap[teamId]?.split(" / ").slice(0, 2).join(" / ") || `T${colIndex + 1}`}
                  </th>
                ))}
                <th style={{ 
                  width: 50, 
                  height: 60, 
                  padding: "4px 4px", 
                  border: "1px solid var(--line-soft)", 
                  background: "var(--paper-2)",
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  W/L
                </th>
                <th style={{ 
                  width: 40, 
                  height: 60, 
                  padding: "4px 4px", 
                  border: "1px solid var(--line-soft)", 
                  background: "var(--paper-2)",
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  Pts
                </th>
                <th style={{ 
                  width: 50, 
                  height: 60, 
                  padding: "4px 4px", 
                  border: "1px solid var(--line-soft)", 
                  background: "var(--paper-2)",
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  Games +/-
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, rowIndex) => (
                <tr key={team.teamId} style={{ borderBottom: "1px solid var(--paper-2)" }}>
                  {/* Position */}
                  <td style={{ 
                    padding: "4px 4px", 
                    border: "1px solid var(--line-soft)",
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 11,
                    background: "var(--paper-1)"
                  }}>
                    {rowIndex + 1}
                  </td>
                  
                  {/* Participants */}
                  <td style={{ 
                    padding: "4px 8px", 
                    border: "1px solid var(--line-soft)",
                    textAlign: "left",
                    fontWeight: 500,
                    fontSize: 11,
                    background: "var(--paper-1)"
                  }}>
                    {team.teamName}
                  </td>
                  
                  {/* Match Matrix Cells */}
                  {orderedTeamIds.map((colTeamId) => (
                    <td key={colTeamId} style={{ 
                      padding: 0, 
                      border: "1px solid var(--line-soft)",
                      verticalAlign: "top",
                      background: team.teamId === colTeamId ? "var(--paper-2)" : "white"
                    }}>
                      {/** When standings are sorted, diagonal must be detected by teamId, not row/column index. */}
                      <MatchCell
                        match={team.teamId === colTeamId ? null : (matchMap.get(`${team.teamId}-${colTeamId}`) || null)}
                        teamMap={teamMap}
                        matchFormat={matchFormat}
                        onSelect={setSelectedMatch}
                        rowTeamId={team.teamId}
                        isDiagonal={team.teamId === colTeamId}
                      />
                    </td>
                  ))}
                  
                  {/* W/L */}
                  <td style={{ 
                    padding: "4px 4px", 
                    border: "1px solid var(--line-soft)",
                    textAlign: "center",
                    fontSize: 11,
                    background: "var(--paper-1)"
                  }}>
                    {team.won}/{team.lost}
                  </td>
                  
                  {/* Points */}
                  <td style={{ 
                    padding: "4px 4px", 
                    border: "1px solid var(--line-soft)",
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 11,
                    background: "var(--paper-1)"
                  }}>
                    {team.points}
                  </td>
                  
                  {/* Games +/- */}
                  <td style={{ 
                    padding: "4px 4px", 
                    border: "1px solid var(--line-soft)",
                    textAlign: "center",
                    fontSize: 11,
                    background: "var(--paper-1)"
                  }}>
                    {team.setsFor - team.setsAgainst > 0 ? "+" : ""}{team.setsFor - team.setsAgainst}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Score Drawer */}
      {selectedMatch && (
        <ScoreDrawer
          match={selectedMatch}
          teamMap={teamMap}
          matchFormat={matchFormat}
          divisionId={divisionId}
          tournamentSlug={tournamentSlug}
          onClose={() => { setSelectedMatch(null); onScoreSaved(); }}
        />
      )}
    </div>
  );
}

// Header component with advance button
export function GroupsHeader({
  divisionName,
  teamsCount,
  groupsCount,
  hasGroups,
  onRegenerateGroups,
  groupComplete,
  isAdvancing,
  isCheckingCompletion,
  handleAdvanceToPlayoffs,
  alreadyAdvanced,
  tournamentSlug,
  divisionId,
}: {
  divisionName: string;
  teamsCount: number;
  groupsCount: number;
  hasGroups: boolean;
  onRegenerateGroups: () => void;
  groupComplete: boolean | null;
  isAdvancing: boolean;
  isCheckingCompletion: boolean;
  handleAdvanceToPlayoffs: () => void;
  alreadyAdvanced: boolean;
  tournamentSlug: string;
  divisionId: string;
}) {
  
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
      <div>
        <div className="wf-serif" style={{ fontSize: 22 }}>
          {divisionName} · {alreadyAdvanced ? "Playoff Stage" : "Group Stage"}
        </div>
        <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
          {teamsCount} team{teamsCount !== 1 ? "s" : ""} · {groupsCount} group{groupsCount !== 1 ? "s" : ""}
          {alreadyAdvanced && " · Advanced to Playoffs"}
        </div>
      </div>
      {hasGroups && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {groupComplete === true && !alreadyAdvanced && (
            <button
              onClick={handleAdvanceToPlayoffs}
              disabled={isAdvancing || isCheckingCompletion}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontFamily: "Poppins, sans-serif",
                background: isAdvancing ? "var(--line-soft)" : "var(--green)",
                border: "none",
                borderRadius: 6,
                cursor: isAdvancing || isCheckingCompletion ? "not-allowed" : "pointer",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              {isAdvancing ? "Advancing..." : "Advance to Playoffs"}
            </button>
          )}
          {alreadyAdvanced && (
            <a
              href={`/admin/t/${tournamentSlug}/d/${divisionId}/bracket`}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontFamily: "Poppins, sans-serif",
                background: "var(--blue)",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                color: "#fff",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              View Playoff Bracket
            </a>
          )}
          <button
            onClick={onRegenerateGroups}
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
            Regenerate Groups
          </button>
        </div>
      )}
    </div>
  );
}

// Client wrapper component
export function GroupsPageClient({
  tournament,
  division,
  teamMap,
  groupRows,
  generateAction,
}: {
  tournament: any;
  division: any;
  teamMap: TeamMap;
  courtMap: Record<string, string>;
  groupRows: GroupRow[];
  generateAction: () => Promise<void>;
}) {
  const hasGroups = groupRows.length > 0;
  const teamsCount = Object.keys(teamMap).length;
  const groupsCount = groupRows.length;
  const divisionId = division._id.toString();
  const tournamentSlug = tournament.slug;
  const { isCheckingCompletion, isAdvancing, groupComplete, alreadyAdvanced, handleAdvanceToPlayoffs, recheckCompletion } =
    useGroupStageStatus(divisionId, tournamentSlug);

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--paper-2)" }}>
          <Link
            href={`/admin/t/${tournamentSlug}`}
            className="muted"
            style={{ fontSize: 14, textDecoration: "none" }}
          >
            {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
            {tournament.name}
          </Link>
          <GroupsHeader
            divisionName={division.name}
            teamsCount={teamsCount}
            groupsCount={groupsCount}
            hasGroups={hasGroups}
            onRegenerateGroups={generateAction}
            groupComplete={groupComplete}
            isAdvancing={isAdvancing}
            isCheckingCompletion={isCheckingCompletion}
            handleAdvanceToPlayoffs={handleAdvanceToPlayoffs}
            alreadyAdvanced={alreadyAdvanced}
            tournamentSlug={tournamentSlug}
            divisionId={divisionId}
          />
        </div>

        {/* Body */}
        {!hasGroups ? (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}>
            {teamsCount < 4 ? (
              <div style={{ textAlign: "center" }}>
                <div className="wf-serif" style={{ fontSize: 20, marginBottom: 8 }}>Not enough teams</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  Add at least 4 teams before generating groups.
                </div>
              </div>
            ) : (
              <>
                <div className="wf-serif" style={{ fontSize: 20 }}>No groups yet</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {teamsCount} teams ready for group stage.
                </div>
                <form action={generateAction}>
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
                    Generate Groups
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <GroupsView
            groups={groupRows}
            teamMap={teamMap}
            divisionId={divisionId}
            tournamentSlug={tournamentSlug}
            matchFormat={(division.matchFormat ?? "BEST_OF_3") as MatchFormat}
            groupSize={division.groupPlayoffConfig?.groupSize ?? 4}
            onScoreSaved={recheckCompletion}
          />
        )}
      </div>
    </div>
  );
}

// Hook for checking group stage completion and advancing
export function useGroupStageStatus(divisionId: string, tournamentSlug: string) {
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [groupComplete, setGroupComplete] = useState<boolean | null>(null);
  const [alreadyAdvanced, setAlreadyAdvanced] = useState(false);
  const [error, setError] = useState("");

  async function checkCompletion() {
    setIsCheckingCompletion(true);
    try {
      const result = await isGroupStageComplete(divisionId);
      
      if (result.error) {
        setError(result.error);
        setGroupComplete(null);
        setAlreadyAdvanced(false);
      } else {
        setGroupComplete(result.complete ?? false);
        setAlreadyAdvanced(result.alreadyAdvanced ?? false);
        setError("");
      }
    } catch (err) {
      setError("Failed to check group stage completion");
      setGroupComplete(null);
      setAlreadyAdvanced(false);
    } finally {
      setIsCheckingCompletion(false);
    }
  }

  useEffect(() => {
    checkCompletion();
  }, [divisionId]);

  async function handleAdvanceToPlayoffs() {
    setIsAdvancing(true);
    setError("");
    
    try {
      const result = await advanceToPlayoffs(divisionId, tournamentSlug);
      if (result.error) {
        setError(result.error);
      } else {
        // Success - redirect or update state
        window.location.href = `/admin/t/${tournamentSlug}/d/${divisionId}/bracket`;
      }
    } catch (err) {
      setError("Failed to advance to playoffs");
    } finally {
      setIsAdvancing(false);
    }
  }

  return {
    isCheckingCompletion,
    isAdvancing,
    groupComplete,
    alreadyAdvanced,
    error,
    handleAdvanceToPlayoffs,
    recheckCompletion: checkCompletion,
  };
}

// Main component
export function GroupsView({
  groups,
  teamMap,
  divisionId,
  tournamentSlug,
  matchFormat,
  groupSize,
  onScoreSaved,
}: {
  groups: GroupRow[];
  teamMap: TeamMap;
  divisionId: string;
  tournamentSlug: string;
  matchFormat: MatchFormat;
  groupSize: number;
  onScoreSaved: () => void;
}) {
  return (
    <div style={{ padding: "16px 24px 24px" }}>
      <div style={{ fontSize: 14, color: "var(--ink-muted)", marginBottom: 20 }}>
        Groups of {groupSize} teams. Top teams advance to playoffs.
      </div>

      {/* Centered group cards container */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            teamMap={teamMap}
            matchFormat={matchFormat}
            divisionId={divisionId}
            tournamentSlug={tournamentSlug}
            onScoreSaved={onScoreSaved}
          />
        ))}
      </div>
    </div>
  );
}
