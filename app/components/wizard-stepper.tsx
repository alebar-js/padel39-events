import { Fragment } from "react";

const STEPS = ["Basics", "Divisions", "Teams", "Review"];

export function WizardStepper({ current }: { current: number }) {
  return (
    <div style={{
      padding: "0 24px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      fontFamily: "Poppins",
      fontSize: 13,
    }}>
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: "1.3px solid " + (active || done ? "var(--green)" : "var(--line-soft)"),
                background: active ? "var(--green)" : done ? "var(--green-tint)" : "transparent",
                color: active ? "var(--paper)" : done ? "var(--green)" : "var(--ink-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{
                color: active ? "var(--ink)" : done ? "var(--green)" : "var(--ink-muted)",
                fontWeight: active ? 500 : 400,
              }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: "0 0 40px",
                height: 1,
                borderTop: "1px dashed var(--line-soft)",
              }} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
