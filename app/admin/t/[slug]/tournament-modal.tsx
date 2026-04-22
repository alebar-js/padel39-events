"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addDivision,
  removeDivision,
  updateDivision,
  updateTournamentInfo,
} from "@/app/lib/actions/manageTournament";
import type {
  DivisionFormat,
  IGroupPlayoffConfig,
  MatchFormat,
  PlayoffQualifyingMode,
} from "@/app/lib/models/Division";
import type { TournamentStatus } from "@/app/lib/models/Tournament";

export type TournamentModalTournament = {
  id: string;
  name: string;
  slug: string;
  venue: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  status: TournamentStatus;
};

export type TournamentModalDivision = {
  id: string;
  name: string;
  format: DivisionFormat;
  matchFormat: MatchFormat;
  teamCount: number;
  groupPlayoffConfig?: IGroupPlayoffConfig;
};

const DEFAULT_GP_CONFIG: IGroupPlayoffConfig = {
  groupSize: 4,
  playoffSize: 8,
  qualifyingMode: "AUTO",
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentModalTournament;
  divisions: TournamentModalDivision[];
}

const STATUS_OPTIONS: TournamentStatus[] = ["DRAFT", "SCHEDULED", "LIVE", "DONE"];
const FORMAT_OPTIONS: { value: DivisionFormat; label: string }[] = [
  { value: "SINGLE_ELIM_CONSOLATION", label: "Single Elim + Back Draw" },
  { value: "GROUP_PLAYOFF", label: "Groups + Playoffs" },
];
const MATCH_FORMAT_OPTIONS: { value: MatchFormat; label: string }[] = [
  { value: "BEST_OF_3", label: "Best of 3" },
  { value: "ONE_SET", label: "One Set" },
];

export default function TournamentModal({ isOpen, onClose, tournament, divisions }: Props) {
  const router = useRouter();

  const [name, setName] = useState(tournament.name);
  const [slug, setSlug] = useState(tournament.slug);
  const [venue, setVenue] = useState(tournament.venue);
  const [startDate, setStartDate] = useState(tournament.startDate);
  const [endDate, setEndDate] = useState(tournament.endDate);
  const [status, setStatus] = useState<TournamentStatus>(tournament.status);
  const [savingInfo, setSavingInfo] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFormat, setEditFormat] = useState<DivisionFormat>("SINGLE_ELIM_CONSOLATION");
  const [editMatchFormat, setEditMatchFormat] = useState<MatchFormat>("BEST_OF_3");
  const [editGpConfig, setEditGpConfig] = useState<IGroupPlayoffConfig>(DEFAULT_GP_CONFIG);
  const [isAdding, setIsAdding] = useState(false);

  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSaveInfo() {
    setSavingInfo(true);
    setError("");
    const result = await updateTournamentInfo(
      tournament.id,
      { name, slug, venue, startDate, endDate, status },
      tournament.slug
    );
    setSavingInfo(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.slug && result.slug !== tournament.slug) {
      router.replace(`/admin/t/${result.slug}`);
    } else {
      router.refresh();
    }
  }

  async function handleAddDivision() {
    setIsAdding(true);
    setError("");
    const result = await addDivision(tournament.id, tournament.slug);
    setIsAdding(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  function startEditing(d: TournamentModalDivision) {
    setEditingId(d.id);
    setEditName(d.name);
    setEditFormat(d.format);
    setEditMatchFormat(d.matchFormat);
    setEditGpConfig(d.groupPlayoffConfig ?? DEFAULT_GP_CONFIG);
    setError("");
  }

  async function handleSaveDivision(id: string) {
    setError("");
    const result = await updateDivision(
      id,
      {
        name: editName,
        format: editFormat,
        matchFormat: editMatchFormat,
        groupPlayoffConfig: editFormat === "GROUP_PLAYOFF" ? editGpConfig : undefined,
      },
      tournament.slug
    );
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleRemoveDivision(id: string) {
    if (!confirm("Remove this division?")) return;
    setError("");
    const result = await removeDivision(id, tournament.slug);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--paper)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 680,
          width: "92%",
          maxHeight: "88vh",
          overflow: "auto",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>Edit tournament</div>
          <button
            onClick={onClose}
            style={{
              padding: "4px 8px",
              fontSize: 16,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-muted)",
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--accent-orange-tint)",
              color: "var(--accent-orange)",
              borderRadius: 6,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <Field label="Name">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Slug" hint={`URL: /admin/t/${slug || "…"}`}>
            <input
              style={inputStyle}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
            />
          </Field>
          <Field label="Venue">
            <input style={inputStyle} value={venue} onChange={(e) => setVenue(e.target.value)} />
          </Field>
          <Field label="Status">
            <select
              style={inputStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value as TournamentStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Start date">
            <input
              type="date"
              style={inputStyle}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              style={inputStyle}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <button
            onClick={handleSaveInfo}
            disabled={savingInfo}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontFamily: "Poppins, sans-serif",
              background: "var(--green)",
              border: "none",
              borderRadius: 6,
              cursor: savingInfo ? "default" : "pointer",
              color: "#fff",
              fontWeight: 500,
            }}
          >
            {savingInfo ? "Saving…" : "Save info"}
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--paper-2)", paddingTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
              Divisions <span style={{ color: "var(--ink-muted)", fontWeight: 400 }}>({divisions.length})</span>
            </div>
            <button
              onClick={handleAddDivision}
              disabled={isAdding}
              style={{
                padding: "6px 12px",
                fontSize: 13,
                fontFamily: "Poppins, sans-serif",
                background: "var(--green)",
                border: "none",
                borderRadius: 6,
                cursor: isAdding ? "default" : "pointer",
                color: "#fff",
                fontWeight: 500,
              }}
            >
              {isAdding ? "Adding…" : "+ Add Division"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {divisions.length === 0 && (
              <div style={{ fontSize: 14, color: "var(--ink-muted)" }}>No divisions yet.</div>
            )}
            {divisions.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: "12px 14px",
                  background: "var(--paper-2)",
                  borderRadius: 8,
                  border: "1px solid var(--paper-3)",
                }}
              >
                {editingId === d.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      style={inputStyle}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveDivision(d.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <select
                        style={inputStyle}
                        value={editFormat}
                        onChange={(e) => setEditFormat(e.target.value as DivisionFormat)}
                      >
                        {FORMAT_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <select
                        style={inputStyle}
                        value={editMatchFormat}
                        onChange={(e) => setEditMatchFormat(e.target.value as MatchFormat)}
                      >
                        {MATCH_FORMAT_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {editFormat === "GROUP_PLAYOFF" && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          padding: 10,
                          background: "var(--paper)",
                          border: "1px solid var(--line-soft)",
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 }}>
                          Groups + Playoffs settings
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <Field label="Group size" hint="Target teams per group">
                            <input
                              type="number"
                              min={2}
                              style={inputStyle}
                              value={editGpConfig.groupSize}
                              onChange={(e) =>
                                setEditGpConfig((c) => ({
                                  ...c,
                                  groupSize: Number(e.target.value),
                                }))
                              }
                            />
                          </Field>
                          <Field label="Playoff size" hint="Teams advancing (power of 2)">
                            <input
                              type="number"
                              min={2}
                              step={2}
                              style={inputStyle}
                              value={editGpConfig.playoffSize}
                              onChange={(e) =>
                                setEditGpConfig((c) => ({
                                  ...c,
                                  playoffSize: Number(e.target.value),
                                }))
                              }
                            />
                          </Field>
                        </div>
                        <Field label="Playoff qualifying">
                          <select
                            style={inputStyle}
                            value={editGpConfig.qualifyingMode}
                            onChange={(e) =>
                              setEditGpConfig((c) => ({
                                ...c,
                                qualifyingMode: e.target.value as PlayoffQualifyingMode,
                              }))
                            }
                          >
                            <option value="AUTO">Auto — top N from groups</option>
                            <option value="MANUAL">Manual — admin picks teams</option>
                          </select>
                        </Field>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          background: "var(--paper-3)",
                          border: "1px solid var(--paper-4)",
                          borderRadius: 4,
                          cursor: "pointer",
                          color: "var(--ink)",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveDivision(d.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          background: "var(--green)",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          color: "#fff",
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{d.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 2 }}>
                        {FORMAT_OPTIONS.find((f) => f.value === d.format)?.label} ·{" "}
                        {MATCH_FORMAT_OPTIONS.find((m) => m.value === d.matchFormat)?.label} · {d.teamCount} team
                        {d.teamCount !== 1 ? "s" : ""}
                      </div>
                      {d.format === "GROUP_PLAYOFF" && d.groupPlayoffConfig && (
                        <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                          Groups of {d.groupPlayoffConfig.groupSize} ·{" "}
                          {d.groupPlayoffConfig.playoffSize}-team playoff ·{" "}
                          {d.groupPlayoffConfig.qualifyingMode === "AUTO"
                            ? "Auto qualifying"
                            : "Manual qualifying"}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => startEditing(d)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          background: "var(--paper-3)",
                          border: "1px solid var(--paper-4)",
                          borderRadius: 4,
                          cursor: "pointer",
                          color: "var(--ink)",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveDivision(d.id)}
                        disabled={d.teamCount > 0}
                        title={d.teamCount > 0 ? "Remove teams first" : "Remove"}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          background: "var(--accent-orange-tint)",
                          border: "1px solid var(--accent-orange)",
                          borderRadius: 4,
                          cursor: d.teamCount > 0 ? "not-allowed" : "pointer",
                          color: "var(--accent-orange)",
                          opacity: d.teamCount > 0 ? 0.5 : 1,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--paper-2)" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              background: "var(--paper-2)",
              border: "1px solid var(--paper-3)",
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--ink)",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 14,
  fontFamily: "Poppins, sans-serif",
  border: "1px solid var(--line-soft)",
  borderRadius: 4,
  background: "var(--paper)",
  color: "var(--ink)",
  width: "100%",
  boxSizing: "border-box",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, color: "var(--ink-muted)", fontWeight: 500 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{hint}</span>}
    </label>
  );
}
