import { Fragment } from "react";
import Link from "next/link";
import { Annotate, Btn, Input, SketchBox } from "./primitives";
import { SidebarNav, StatusChip } from "./chrome";

export function NewTournamentWizard() {
  const steps = ["Basics", "Divisions", "Teams", "Review"];
  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px 8px" }}>
          <Link href="/" className="wf-hand muted" style={{ fontSize: 14, textDecoration: "none" }}>
            ← Tournaments / New
          </Link>
        </div>

        <div style={{ padding: "0 24px 16px", display: "flex", alignItems: "center", gap: 12, fontFamily: "Poppins", fontSize: 13 }}>
          {steps.map((s, i) => (
            <Fragment key={s}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "1.3px solid " + (i === 0 ? "var(--green)" : "var(--line-soft)"),
                  background: i === 0 ? "var(--green)" : "transparent",
                  color: i === 0 ? "var(--paper)" : "var(--ink-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                }}>{i + 1}</div>
                <span style={{ color: i === 0 ? "var(--ink)" : "var(--ink-muted)" }}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: "0 0 40px", height: 1, borderTop: "1px dashed var(--line-soft)" }} />
              )}
            </Fragment>
          ))}
        </div>

        <div style={{ padding: "8px 24px 24px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 24, marginBottom: 4 }}>Tournament basics</div>
            <div className="wf-hand muted" style={{ fontSize: 16, marginBottom: 20 }}>
              What are we running, and when?
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "Poppins", fontSize: 13, marginBottom: 4 }}>Name</div>
                <Input box value="Spring Open 2026" width="100%" />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Poppins", fontSize: 13, marginBottom: 4 }}>Start</div>
                  <Input box value="May 2, 2026" width="100%" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Poppins", fontSize: 13, marginBottom: 4 }}>End</div>
                  <Input box value="May 4, 2026" width="100%" />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "Poppins", fontSize: 13, marginBottom: 4 }}>Public URL slug</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "Poppins, sans-serif", fontSize: 12, color: "var(--ink-muted)" }}>
                    padel39.events/t/
                  </span>
                  <Input box value="spring-open-2026" width={180} />
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "Poppins", fontSize: 13, marginBottom: 6 }}>
                  Venue <span className="muted">(optional)</span>
                </div>
                <Input box placeholder="Padel39 Dallas" width="100%" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <Link href="/" style={{ textDecoration: "none" }}>
                <Btn>Cancel</Btn>
              </Link>
              <Btn primary>Next: Divisions →</Btn>
            </div>
          </div>

          <div>
            <div className="wf-hand muted" style={{ fontSize: 14, marginBottom: 8 }}>Preview</div>
            <SketchBox fill="#faf7f2" style={{ padding: 0, height: 150 }}>
              <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="wf-serif" style={{ fontSize: 18 }}>Spring Open 2026</div>
                  <StatusChip status="Draft" />
                </div>
                <div className="wf-hand muted" style={{ fontSize: 16 }}>May 2–4</div>
                <div style={{ flex: 1 }} />
                <div style={{
                  fontFamily: "Poppins, sans-serif",
                  fontSize: 10,
                  color: "var(--ink-muted)",
                  borderTop: "1px dashed var(--line-soft)",
                  paddingTop: 6,
                }}>
                  /t/spring-open-2026
                </div>
              </div>
            </SketchBox>
            <div style={{ marginTop: 14 }}>
              <Annotate>Live preview · reflects what admins &amp; players will see</Annotate>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
