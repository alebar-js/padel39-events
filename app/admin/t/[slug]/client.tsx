"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, SketchBox } from "@/app/components/primitives";
import { addTeam, deleteTeam, reorderTeams, type AddTeamState } from "@/app/lib/actions/addTeam";
import { bulkAddTeams, type BulkAddTeamsState } from "@/app/lib/actions/bulkAddTeams";

type Division = { id: string; name: string; format: string; teamCount: number };

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIM_CONSOLATION: "Single Elim + Back Draw",
  GROUP_PLAYOFF: "Groups + Playoffs",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  fontFamily: "Poppins, sans-serif",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--paper)",
  border: "1px solid var(--line-soft)",
  borderRadius: 6,
  outline: "none",
};

// ─── Division dropdown ────────────────────────────────────────────────────────

export function DivisionSelector({
  divisions,
  activeDivisionId,
  tournamentSlug,
}: {
  divisions: Division[];
  activeDivisionId: string;
  tournamentSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const active = divisions.find((d) => d.id === activeDivisionId) ?? divisions[0];

  return (
    <div style={{
      padding: "12px 24px 10px",
      borderBottom: "1px solid var(--paper-2)",
      display: "flex",
      alignItems: "center",
      gap: 16,
      position: "relative",
    }}>
      <div style={{ fontFamily: "Poppins", fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
        Division
      </div>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 12px",
            minWidth: 280,
            border: "1.5px solid var(--line)",
            borderRadius: 6,
            background: "var(--paper)",
            cursor: "pointer",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          <span className="wf-serif" style={{ fontSize: 17 }}>{active?.name}</span>
          <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>· {FORMAT_LABELS[active?.format ?? ""]}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--green)" }}>{active?.teamCount} teams</span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>▾</span>
        </button>

        {open && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
            <div style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              width: 360,
              background: "var(--paper)",
              border: "1.5px solid var(--line)",
              borderRadius: 6,
              boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
              zIndex: 10,
              padding: 4,
            }}>
              {divisions.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    router.push(`/admin/t/${tournamentSlug}?d=${d.id}`);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 4,
                    background: d.id === activeDivisionId ? "var(--green-tint)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    border: "none",
                    fontFamily: "Poppins, sans-serif",
                    textAlign: "left",
                  }}
                >
                  <span className={d.id === activeDivisionId ? "wf-check" : "wf-circle"} />
                  <div style={{ flex: 1 }}>
                    <div className="wf-serif" style={{ fontSize: 14, color: d.id === activeDivisionId ? "var(--green)" : "var(--ink)" }}>
                      {d.name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>{FORMAT_LABELS[d.format]}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{d.teamCount}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Quick add form ───────────────────────────────────────────────────────────

export function QuickAddForm({
  divisionId,
  tournamentSlug,
}: {
  divisionId: string;
  tournamentSlug: string;
}) {
  const [state, action, pending] = useActionState<AddTeamState, FormData>(addTeam, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await action(fd);
        formRef.current?.reset();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <input type="hidden" name="divisionId" value={divisionId} />
      <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input name="player1" type="text" placeholder="Player 1" required style={inputStyle} />
        <span className="muted" style={{ fontSize: 13 }}>&amp;</span>
        <input name="player2" type="text" placeholder="Player 2" required style={inputStyle} />
        <Btn small type="submit" style={{ opacity: pending ? 0.6 : 1, flexShrink: 0 }}>
          {pending ? "…" : "Add"}
        </Btn>
      </div>
      {state?.error && <div style={{ fontSize: 12, color: "var(--accent-orange)" }}>{state.error}</div>}
    </form>
  );
}

// ─── Bulk add form ────────────────────────────────────────────────────────────

export function BulkAddForm({
  divisionId,
  tournamentSlug,
}: {
  divisionId: string;
  tournamentSlug: string;
}) {
  const [state, action, pending] = useActionState<BulkAddTeamsState, FormData>(bulkAddTeams, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [raw, setRaw] = useState("");

  const pairCount = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l.split(/[,&\/\t]+/).filter(Boolean).length >= 2).length;

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await action(fd);
        setRaw("");
        formRef.current?.reset();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <input type="hidden" name="divisionId" value={divisionId} />
      <input type="hidden" name="tournamentSlug" value={tournamentSlug} />
      <div style={{ fontSize: 13, color: "var(--ink-muted)" }}>
        Add teams <span style={{ fontSize: 11 }}>— one per line, "Player 1, Player 2"</span>
      </div>
      <textarea
        name="teams"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={"Maria Ruiz, Ana García\nCarlos López, Diego Torres"}
        style={{
          padding: "10px 12px",
          fontFamily: "Poppins, sans-serif",
          fontSize: 13,
          color: "var(--ink)",
          background: "var(--paper)",
          border: "1px solid var(--line-soft)",
          borderRadius: 6,
          outline: "none",
          resize: "vertical",
          minHeight: 90,
          lineHeight: 1.7,
        }}
      />
      {state?.error && <div style={{ fontSize: 12, color: "var(--accent-orange)" }}>{state.error}</div>}
      {state?.added && <div style={{ fontSize: 12, color: "var(--green)" }}>✓ Added {state.added} team{state.added !== 1 ? "s" : ""}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
          {pairCount} pair{pairCount !== 1 ? "s" : ""} detected
        </span>
        <Btn small primary type="submit" style={{ opacity: pending || pairCount === 0 ? 0.5 : 1 }}>
          {pending ? "Adding…" : `Add ${pairCount || ""} teams`}
        </Btn>
      </div>
    </form>
  );
}

// ─── Sortable roster table ────────────────────────────────────────────────────

type TeamRow = { id: string; player1: string; player2: string; seed: number };

export function SortableRoster({
  initialTeams,
  tournamentSlug,
}: {
  initialTeams: TeamRow[];
  tournamentSlug: string;
}) {
  const [teams, setTeams] = useState<TeamRow[]>(initialTeams);
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function handleDragStart(i: number) {
    dragIdx.current = i;
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOver(i);
  }

  function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    const from = dragIdx.current;
    if (from === null || from === targetIdx) {
      setDragOver(null);
      return;
    }
    const next = [...teams];
    const [moved] = next.splice(from, 1);
    next.splice(targetIdx, 0, moved);
    const reseeded = next.map((t, i) => ({ ...t, seed: i + 1 }));
    setTeams(reseeded);
    dragIdx.current = null;
    setDragOver(null);
    reorderTeams(reseeded.map((t) => t.id), tournamentSlug);
  }

  function handleDragEnd() {
    dragIdx.current = null;
    setDragOver(null);
  }

  return (
    <div style={{ border: "1px solid var(--line-soft)", borderRadius: 8, overflow: "hidden", background: "var(--paper)" }}>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr 1fr 32px",
        gap: 8,
        padding: "8px 12px",
        fontSize: 10,
        color: "var(--ink-muted)",
        textTransform: "uppercase",
        letterSpacing: 1,
        borderBottom: "1px dashed var(--line-soft)",
      }}>
        <div>Seed #</div>
        <div>Player 1</div>
        <div>Player 2</div>
        <div />
      </div>

      {/* Rows */}
      {teams.map((t, i) => (
        <div
          key={t.id}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={handleDragEnd}
          style={{
            display: "grid",
            gridTemplateColumns: "52px 1fr 1fr 32px",
            gap: 8,
            padding: "8px 12px",
            alignItems: "center",
            fontSize: 14,
            borderBottom: i < teams.length - 1 ? "1px solid var(--paper-2)" : "none",
            cursor: "grab",
            background: dragOver === i ? "var(--green-tint)" : "var(--paper)",
            transition: "background 80ms",
            userSelect: "none",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="wf-drag" style={{ opacity: 0.4, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--ink-muted)", minWidth: 16 }}>{t.seed}</span>
          </span>
          <span>{t.player1}</span>
          <span>{t.player2}</span>
          <form action={() => deleteTeam(t.id, tournamentSlug)}>
            <button
              type="submit"
              title="Remove team"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 16, lineHeight: 1, padding: "0 4px" }}
            >
              ×
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}

// ─── Delete team button ───────────────────────────────────────────────────────

export function DeleteTeamButton({ teamId, tournamentSlug }: { teamId: string; tournamentSlug: string }) {
  return (
    <form action={() => deleteTeam(teamId, tournamentSlug)}>
      <button
        type="submit"
        title="Remove team"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--ink-muted)",
          fontSize: 16,
          lineHeight: 1,
          padding: "0 4px",
        }}
      >
        ×
      </button>
    </form>
  );
}
