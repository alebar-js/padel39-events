"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SidebarNav, StatusChip } from "@/app/components/chrome";
import { Btn, SketchBox } from "@/app/components/primitives";
import { createTournament, type CreateTournamentState } from "@/app/lib/actions/createTournament";
import { WizardStepper } from "@/app/components/wizard-stepper";
import { fmtDateRange } from "@/app/lib/data";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontFamily: "Poppins, sans-serif",
  fontSize: 14,
  color: "var(--ink)",
  background: "var(--paper)",
  border: "1px solid var(--line-soft)",
  borderRadius: 6,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 4,
  display: "block",
};

export default function NewTournamentPage() {
  const [state, action, pending] = useActionState<CreateTournamentState, FormData>(
    createTournament,
    null
  );

  const [preview, setPreview] = useState({ name: "", startDate: "", endDate: "", venue: "" });

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px 8px" }}>
          <Link href="/admin" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>
            ← Tournaments / New
          </Link>
        </div>

        <WizardStepper current={0} />

        <div style={{ padding: "8px 24px 24px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 24, marginBottom: 4 }}>Tournament basics</div>
            <div className="muted" style={{ fontSize: 15, marginBottom: 20 }}>What are we running, and when?</div>

            <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

              <div>
                <label htmlFor="name" style={labelStyle}>Name</label>
                <input
                  id="name" name="name" type="text" required
                  placeholder="Spring Open 2026"
                  style={inputStyle}
                  onChange={(e) => setPreview((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label htmlFor="startDate" style={labelStyle}>Start</label>
                  <input
                    id="startDate" name="startDate" type="date" required
                    style={inputStyle}
                    onChange={(e) => setPreview((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="endDate" style={labelStyle}>End</label>
                  <input
                    id="endDate" name="endDate" type="date" required
                    style={inputStyle}
                    onChange={(e) => setPreview((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="venue" style={labelStyle}>
                  Venue <span className="muted" style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  id="venue" name="venue" type="text"
                  placeholder="Padel39 Dallas"
                  style={inputStyle}
                  onChange={(e) => setPreview((p) => ({ ...p, venue: e.target.value }))}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <Link href="/admin" style={{ textDecoration: "none" }}>
                  <Btn>Cancel</Btn>
                </Link>
                <Btn primary type="submit" style={{ opacity: pending ? 0.6 : 1 }}>
                  {pending ? "Saving…" : "Next: Divisions →"}
                </Btn>
              </div>
            </form>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Preview</div>
            <SketchBox fill="#faf7f2" style={{ padding: 0, height: 150 }}>
              <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="wf-serif" style={{ fontSize: 18, color: preview.name ? "var(--ink)" : "var(--ink-muted)" }}>
                    {preview.name || "Tournament name"}
                  </div>
                  <StatusChip status="Draft" />
                </div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {preview.startDate && preview.endDate
                    ? fmtDateRange(preview.startDate, preview.endDate)
                    : "Dates"}
                  {preview.venue ? ` · ${preview.venue}` : ""}
                </div>
                <div style={{ flex: 1 }} />
                <div style={{
                  fontSize: 10,
                  color: "var(--ink-muted)",
                  borderTop: "1px dashed var(--line-soft)",
                  paddingTop: 6,
                }}>
                  /t/{preview.name ? preview.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : "…"}
                </div>
              </div>
            </SketchBox>
            <div style={{ marginTop: 12, fontSize: 13, fontStyle: "italic", color: "var(--green)" }}>
              Live preview · reflects what the card will look like
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
