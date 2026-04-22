import Link from "next/link";
import { TOURNEYS } from "./lib/data";
import { Logo } from "./components/primitives";

export default function Home() {
  const active = TOURNEYS.filter((t) => t.status === "Live");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ marginBottom: 40 }}>
        <Logo size={20} />
      </div>

      <h1 className="wf-serif" style={{ fontSize: 32, marginBottom: 6 }}>
        Active Tournaments
      </h1>
      <p style={{ color: "var(--ink-muted)", fontSize: 15, marginBottom: 32 }}>
        {active.length} tournament{active.length !== 1 ? "s" : ""} running now
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {active.map((t) => (
          <Link
            key={t.slug}
            href={`/t/${t.slug}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                padding: "16px 20px",
                border: "1px solid var(--line-soft)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--paper)",
                cursor: "pointer",
              }}
            >
              <div>
                <div className="wf-serif" style={{ fontSize: 19, lineHeight: 1.2 }}>{t.name}</div>
                <div style={{ fontSize: 14, color: "var(--ink-muted)", marginTop: 3 }}>
                  {t.dates} · {t.divisions} divisions · {t.teams} teams
                </div>
              </div>
              <span style={{ fontSize: 18, opacity: 0.3 }}>→</span>
            </div>
          </Link>
        ))}

        {active.length === 0 && (
          <div style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "var(--ink-muted)",
            border: "1px dashed var(--line-soft)",
            borderRadius: 8,
          }}>
            No tournaments running right now.
          </div>
        )}
      </div>
    </div>
  );
}
