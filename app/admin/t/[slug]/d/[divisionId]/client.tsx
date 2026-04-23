"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { SidebarNav } from "@/app/components/chrome";
import { advanceToPlayoffs, isGroupStageComplete } from "@/app/lib/actions/advanceToPlayoffs";
import { BracketView } from "./bracket/client";
import { GroupsView } from "./groups/client";
import type { MatchFormat as BracketMatchFormat, MatchRow as BracketMatchRow, TeamMap as BracketTeamMap } from "./bracket/page";
import type { GroupRow, MatchFormat as GroupMatchFormat, TeamMap as GroupTeamMap } from "./groups/page";

type GroupPlayoffTab = "groups" | "playoffs";

const secondaryButtonStyle: CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  fontFamily: "Poppins, sans-serif",
  background: "none",
  border: "1px solid var(--line-soft)",
  borderRadius: 6,
  cursor: "pointer",
  color: "var(--ink-muted)",
};

const primaryButtonStyle: CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
  fontFamily: "Poppins, sans-serif",
  background: "var(--green)",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  color: "#fff",
  fontWeight: 600,
};

const largePrimaryButtonStyle: CSSProperties = {
  padding: "10px 24px",
  fontSize: 15,
  fontFamily: "Poppins, sans-serif",
  background: "var(--green)",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  color: "#fff",
  fontWeight: 600,
};

export function GroupPlayoffDivisionClient({
  tournament,
  division,
  teamMap,
  groupRows,
  mainRows,
  backRows,
  initialTab,
  generateGroupsAction,
  generatePlayoffAction,
}: {
  tournament: { name: string; slug: string };
  division: {
    _id: string;
    name: string;
    matchFormat?: BracketMatchFormat;
    groupPlayoffConfig?: { groupSize?: number };
  };
  teamMap: GroupTeamMap & BracketTeamMap;
  groupRows: GroupRow[];
  mainRows: BracketMatchRow[];
  backRows: BracketMatchRow[];
  initialTab: GroupPlayoffTab;
  generateGroupsAction: () => Promise<void>;
  generatePlayoffAction: () => Promise<void>;
}) {
  const [tab, setTab] = useState<GroupPlayoffTab>(initialTab);
  const divisionId = division._id;
  const tournamentSlug = tournament.slug;
  const hasGroups = groupRows.length > 0;
  const hasPlayoffBracket = mainRows.length > 0;
  const teamsCount = Object.keys(teamMap).length;
  const groupsCount = groupRows.length;
  const matchFormat = (division.matchFormat ?? "BEST_OF_3") as GroupMatchFormat & BracketMatchFormat;
  const [isCheckingCompletion, setIsCheckingCompletion] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [groupComplete, setGroupComplete] = useState<boolean | null>(initialTab === "playoffs" ? true : null);
  const [alreadyAdvanced, setAlreadyAdvanced] = useState(initialTab === "playoffs");
  const [statusLoaded, setStatusLoaded] = useState(initialTab === "playoffs");

  async function ensureStatusLoaded() {
    if (statusLoaded || isCheckingCompletion) return;
    setIsCheckingCompletion(true);
    try {
      const result = await isGroupStageComplete(divisionId);
      setGroupComplete(result.complete ?? false);
      setAlreadyAdvanced(result.alreadyAdvanced ?? false);
    } finally {
      setStatusLoaded(true);
      setIsCheckingCompletion(false);
    }
  }

  async function handleAdvanceToPlayoffs() {
    setIsAdvancing(true);
    const result = await advanceToPlayoffs(divisionId, tournamentSlug);
    setIsAdvancing(false);
    if (!result.error) {
      window.location.href = `/admin/t/${tournamentSlug}/d/${divisionId}`;
    }
  }

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px 12px", borderBottom: "1px solid var(--paper-2)" }}>
          <Link
            href={`/admin/t/${tournamentSlug}`}
            className="muted"
            style={{ fontSize: 14, textDecoration: "none" }}
          >
            ← {tournament.name}
          </Link>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 16 }}>
            <div>
              <div className="wf-serif" style={{ fontSize: 22 }}>
                {division.name} · Matches
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {teamsCount} team{teamsCount !== 1 ? "s" : ""} · {groupsCount} group{groupsCount !== 1 ? "s" : ""}
                {alreadyAdvanced ? " · Playoffs available" : ""}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {tab === "groups" ? (
                <>
                  {groupComplete === true && !alreadyAdvanced && (
                    <button
                      onClick={handleAdvanceToPlayoffs}
                      disabled={isAdvancing || isCheckingCompletion}
                      style={primaryButtonStyle}
                    >
                      {isAdvancing ? "Advancing..." : "Advance to Playoffs"}
                    </button>
                  )}
                  <button onClick={generateGroupsAction} style={secondaryButtonStyle}>
                    Regenerate Groups
                  </button>
                </>
              ) : hasPlayoffBracket ? (
                <button onClick={generatePlayoffAction} style={secondaryButtonStyle}>
                  Regenerate
                </button>
              ) : alreadyAdvanced ? (
                <button onClick={generatePlayoffAction} style={primaryButtonStyle}>
                  Generate Playoff Bracket
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 32px 0", borderBottom: "1px solid var(--paper-2)" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {([
              { id: "groups", label: "Group Stage" },
              { id: "playoffs", label: "Playoffs" },
            ] as const).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  if (item.id === "playoffs") {
                    void ensureStatusLoaded();
                  }
                }}
                style={{
                  padding: "7px 16px",
                  fontSize: 13,
                  fontFamily: "Poppins, sans-serif",
                  fontWeight: tab === item.id ? 600 : 400,
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${tab === item.id ? "var(--green)" : "transparent"}`,
                  borderRadius: 0,
                  cursor: "pointer",
                  color: tab === item.id ? "var(--ink)" : "var(--ink-muted)",
                  marginBottom: -1,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
            {tab === "groups"
              ? `${groupsCount} group${groupsCount !== 1 ? "s" : ""}`
              : hasPlayoffBracket
                ? `${mainRows.length} playoff match${mainRows.length !== 1 ? "es" : ""}`
                : alreadyAdvanced
                  ? "Bracket not generated yet"
                  : "Available after advancing"}
          </div>
        </div>

        {tab === "groups" ? (
          !hasGroups ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
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
                  <form action={generateGroupsAction}>
                    <button type="submit" style={largePrimaryButtonStyle}>
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
              matchFormat={matchFormat}
              groupSize={division.groupPlayoffConfig?.groupSize ?? 4}
              onScoreSaved={() => undefined}
            />
          )
        ) : !alreadyAdvanced ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 24px",
            }}
          >
            <div
              style={{
                maxWidth: 520,
                textAlign: "center",
                border: "1px solid var(--paper-2)",
                borderRadius: 12,
                background: "var(--paper)",
                padding: "28px 24px",
                boxShadow: "0 1px 3px rgba(0,0,0,.04)",
              }}
            >
              <div className="wf-serif" style={{ fontSize: 24, marginBottom: 10 }}>
                Playoffs unlock after group stage
              </div>
              <div className="muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
                Finish the group matches, then advance the division to generate the playoff bracket.
              </div>
            </div>
          </div>
        ) : !hasPlayoffBracket ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div className="wf-serif" style={{ fontSize: 20 }}>No bracket yet</div>
            <div className="muted" style={{ fontSize: 14 }}>
              Generate the playoff bracket for this division.
            </div>
            <form action={generatePlayoffAction}>
              <button type="submit" style={largePrimaryButtonStyle}>
                Generate Playoff Bracket
              </button>
            </form>
          </div>
        ) : (
          <BracketView
            matches={mainRows}
            backMatches={backRows}
            teamMap={teamMap}
            divisionId={divisionId}
            tournamentSlug={tournamentSlug}
            matchFormat={matchFormat}
          />
        )}
      </div>
    </div>
  );
}
