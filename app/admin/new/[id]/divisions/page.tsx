"use client";

import { useActionState, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SidebarNav } from "@/app/components/chrome";
import { Btn } from "@/app/components/primitives";
import { WizardStepper } from "@/app/components/wizard-stepper";
import { saveDivisions, type SaveDivisionsState } from "@/app/lib/actions/saveDivisions";

type DivRow = {
  name: string;
  format: "SINGLE_ELIM_CONSOLATION" | "GROUP_PLAYOFF";
  matchFormat: "ONE_SET" | "BEST_OF_3";
};

const FORMAT_LABELS: Record<DivRow["format"], string> = {
  SINGLE_ELIM_CONSOLATION: "Single Elim + Back Draw",
  GROUP_PLAYOFF: "Groups + Playoffs",
};

const MATCH_FORMAT_LABELS: Record<DivRow["matchFormat"], string> = {
  ONE_SET: "1 set",
  BEST_OF_3: "Best of 3",
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

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontFamily: "Poppins, sans-serif",
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--paper)",
  border: "1px solid var(--line-soft)",
  borderRadius: 6,
  outline: "none",
  cursor: "pointer",
};

export default function DivisionsStep() {
  const { id } = useParams<{ id: string }>();
  const [state, action, pending] = useActionState<SaveDivisionsState, FormData>(saveDivisions, null);
  const [rows, setRows] = useState<DivRow[]>([
    { name: "", format: "SINGLE_ELIM_CONSOLATION", matchFormat: "BEST_OF_3" },
  ]);

  function addRow() {
    setRows((r) => [...r, { name: "", format: "SINGLE_ELIM_CONSOLATION", matchFormat: "BEST_OF_3" }]);
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  function update(i: number, field: keyof DivRow, value: string) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px 8px" }}>
          <Link href="/admin" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>
            ← Tournaments / New
          </Link>
        </div>

        <WizardStepper current={1} />

        <div style={{ padding: "8px 24px 24px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 24, marginBottom: 4 }}>Divisions</div>
            <div className="muted" style={{ fontSize: 15, marginBottom: 20 }}>
              Add each category — men's, women's, mixed, etc.
            </div>

            <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="hidden" name="tournamentId" value={id} />

              {state?.error && (
                <div style={{
                  padding: "10px 14px",
                  background: "rgba(224,122,59,0.1)",
                  border: "1px solid var(--accent-orange)",
                  borderRadius: 6,
                  fontSize: 14,
                  color: "var(--accent-orange)",
                }}>
                  {state.error}
                </div>
              )}

              {rows.map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    name="name"
                    type="text"
                    placeholder={`Division ${i + 1} (e.g. Men's A)`}
                    value={row.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    style={inputStyle}
                  />
                  <select
                    name="format"
                    value={row.format}
                    onChange={(e) => update(i, "format", e.target.value as DivRow["format"])}
                    style={selectStyle}
                  >
                    {(Object.entries(FORMAT_LABELS) as [DivRow["format"], string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <select
                    name="matchFormat"
                    value={row.matchFormat}
                    onChange={(e) => update(i, "matchFormat", e.target.value as DivRow["matchFormat"])}
                    style={selectStyle}
                  >
                    {(Object.entries(MATCH_FORMAT_LABELS) as [DivRow["matchFormat"], string][]).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-muted)", fontSize: 18, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addRow}
                style={{
                  alignSelf: "flex-start",
                  background: "none",
                  border: "1px dashed var(--line-soft)",
                  borderRadius: 6,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--green)",
                  fontFamily: "Poppins, sans-serif",
                }}
              >
                + Add division
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <Link href={`/admin/new`} style={{ textDecoration: "none" }}>
                  <Btn>← Back</Btn>
                </Link>
                <Btn primary type="submit" style={{ opacity: pending ? 0.6 : 1 }}>
                  {pending ? "Saving…" : "Next: Teams →"}
                </Btn>
              </div>
            </form>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Your divisions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.filter((r) => r.name).map((r, i) => (
                <div key={i} style={{
                  padding: "10px 14px",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span className="wf-serif" style={{ fontSize: 16 }}>{r.name}</span>
                  <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                    {FORMAT_LABELS[r.format]} · {MATCH_FORMAT_LABELS[r.matchFormat]}
                  </span>
                </div>
              ))}
              {rows.filter((r) => r.name).length === 0 && (
                <div className="muted" style={{ fontSize: 13, fontStyle: "italic" }}>
                  Divisions will appear here as you type.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
