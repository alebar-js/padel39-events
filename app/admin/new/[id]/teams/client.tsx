"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SidebarNav } from "@/app/components/chrome";
import { Btn } from "@/app/components/primitives";
import { WizardStepper } from "@/app/components/wizard-stepper";
import { saveTeams, type SaveTeamsState } from "@/app/lib/actions/saveTeams";

type Division = { id: string; name: string; format: string };

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 140,
  padding: "10px 12px",
  fontFamily: "Poppins, sans-serif",
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--paper)",
  border: "1px solid var(--line-soft)",
  borderRadius: 6,
  outline: "none",
  resize: "vertical",
  lineHeight: 1.7,
};

function parseLines(raw: string) {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split(/[,&\/\t]+/).map((s) => s.trim()).filter(Boolean);
      return parts.length >= 2 ? `${parts[0]} / ${parts[1]}` : null;
    })
    .filter(Boolean) as string[];
}

export function TeamsStepClient({
  tournamentId,
  divisions,
}: {
  tournamentId: string;
  divisions: Division[];
}) {
  const [state, action, pending] = useActionState<SaveTeamsState, FormData>(saveTeams, null);
  const [active, setActive] = useState(0);
  const [raws, setRaws] = useState<string[]>(divisions.map(() => ""));

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px 8px" }}>
          <Link href="/admin" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>
            ← Tournaments / New
          </Link>
        </div>

        <WizardStepper current={2} />

        <div style={{ padding: "8px 24px 24px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 24, marginBottom: 4 }}>Teams</div>
            <div className="muted" style={{ fontSize: 15, marginBottom: 16 }}>
              Paste pairs — one per line, separated by comma, &amp;, or /
            </div>

            {/* Division tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid var(--line-soft)" }}>
              {divisions.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActive(i)}
                  style={{
                    padding: "6px 14px",
                    fontFamily: "Poppins, sans-serif",
                    fontSize: 13,
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    borderBottom: i === active ? "2px solid var(--green)" : "2px solid transparent",
                    color: i === active ? "var(--ink)" : "var(--ink-muted)",
                    fontWeight: i === active ? 500 : 400,
                    marginBottom: -1,
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>

            <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              {divisions.map((d, i) => (
                <div key={d.id} style={{ display: i === active ? "block" : "none" }}>
                  <input type="hidden" name="divisionId" value={d.id} />
                  <textarea
                    name="teams"
                    placeholder={"Maria Ruiz, Ana García\nCarlos López, Diego Torres\n…"}
                    value={raws[i]}
                    onChange={(e) => setRaws((r) => r.map((v, idx) => idx === i ? e.target.value : v))}
                    style={textareaStyle}
                  />
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {parseLines(raws[i]).length} pair{parseLines(raws[i]).length !== 1 ? "s" : ""} detected
                  </div>
                </div>
              ))}

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

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <Link href={`/admin/new/${tournamentId}/divisions`} style={{ textDecoration: "none" }}>
                  <Btn>← Back</Btn>
                </Link>
                <Btn primary type="submit" style={{ opacity: pending ? 0.6 : 1 }}>
                  {pending ? "Saving…" : "Next: Review →"}
                </Btn>
              </div>
            </form>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
              {divisions[active]?.name} — roster preview
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {parseLines(raws[active]).map((pair, i) => (
                <div key={i} style={{
                  padding: "8px 12px",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 6,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 14,
                }}>
                  <span style={{ fontSize: 11, color: "var(--ink-muted)", minWidth: 20 }}>{i + 1}</span>
                  <span>{pair}</span>
                </div>
              ))}
              {parseLines(raws[active]).length === 0 && (
                <div className="muted" style={{ fontSize: 13, fontStyle: "italic" }}>
                  Pairs will appear here as you type.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
