import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Logo, Input, Chip } from "./primitives";
import type { Status } from "@/app/lib/data";

type NavId = "tournaments" | "courts" | "settings";

export function SidebarNav({ active = "tournaments" }: { active?: NavId }) {
  const items: { id: NavId; label: string; icon: string; href: string }[] = [
    { id: "tournaments", label: "Tournaments", icon: "♦", href: "/admin" },
    { id: "courts", label: "Courts", icon: "▢", href: "#" },
    { id: "settings", label: "Settings", icon: "☰", href: "#" },
  ];
  return (
    <div
      style={{
        width: 180,
        background: "var(--green)",
        color: "var(--paper)",
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        flexShrink: 0,
        minHeight: "100vh",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <Link href="/admin" style={{ padding: "4px 6px 18px", textDecoration: "none" }}>
        <Logo color="var(--paper)" size={15} />
      </Link>
      <div
        style={{
          fontSize: 11,
          opacity: 0.55,
          textTransform: "uppercase",
          letterSpacing: 1,
          padding: "8px 8px 4px",
          fontFamily: "Poppins",
        }}
      >
        Events
      </div>
      {items.map((it) => (
        <Link
          key={it.id}
          href={it.href}
          style={{
            padding: "7px 10px",
            borderRadius: 5,
            background: it.id === active ? "rgba(255,255,255,0.12)" : "transparent",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: it.id === active ? 1 : 0.78,
            color: "var(--paper)",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: 11, opacity: 0.7 }}>{it.icon}</span>
          {it.label}
        </Link>
      ))}
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 6px",
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--accent-yellow)",
            color: "var(--green)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          MR
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.1 }}>
          <div>Maria R.</div>
          <div style={{ opacity: 0.6, fontSize: 10 }}>Director</div>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        padding: "20px 24px 12px",
      }}
    >
      <div>
        <div className="wf-serif" style={{ fontSize: 28, lineHeight: 1, letterSpacing: -0.3 }}>
          {title}
        </div>
        {subtitle && (
          <div className="wf-hand" style={{ fontSize: 17, color: "var(--ink-muted)", marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {rightSlot}
    </div>
  );
}

export function ViewToggle({
  mode,
  onSet,
}: {
  mode: "cards" | "table";
  onSet: (m: "cards" | "table") => void;
}) {
  const pill: CSSProperties = {
    padding: "3px 12px",
    borderRadius: 16,
    cursor: "pointer",
  };
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1.2px solid var(--line)",
        borderRadius: 20,
        padding: 2,
        fontFamily: "Poppins",
        fontSize: 13,
      }}
    >
      <div
        onClick={() => onSet("cards")}
        style={{
          ...pill,
          background: mode === "cards" ? "var(--green)" : "transparent",
          color: mode === "cards" ? "var(--paper)" : "var(--ink)",
        }}
      >
        ▦ Cards
      </div>
      <div
        onClick={() => onSet("table")}
        style={{
          ...pill,
          background: mode === "table" ? "var(--green)" : "transparent",
          color: mode === "table" ? "var(--paper)" : "var(--ink)",
        }}
      >
        ☰ Table
      </div>
    </div>
  );
}

export function StatusChip({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; fg: string }> = {
    Live: { bg: "var(--green)", fg: "var(--paper)" },
    Draft: { bg: "transparent", fg: "var(--ink-muted)" },
    Scheduled: { bg: "var(--accent-yellow)", fg: "var(--ink)" },
    Done: { bg: "var(--paper-2)", fg: "var(--ink-muted)" },
  };
  const c = map[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 9px",
        fontFamily: "Poppins",
        fontSize: 12,
        background: c.bg,
        color: c.fg,
        border: status === "Draft" ? "1px dashed var(--line-soft)" : "none",
        borderRadius: 999,
      }}
    >
      {status === "Live" && (
        <span
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--paper)" }}
        />
      )}
      {status}
    </span>
  );
}

export function Filters() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 24px 14px" }}>
      <Input box placeholder="🔍 Search tournaments..." width={220} />
      <Chip>All statuses ▾</Chip>
      <Chip>This month ▾</Chip>
      <div style={{ flex: 1 }} />
    </div>
  );
}
