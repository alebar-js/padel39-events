import type { CSSProperties, ReactNode } from "react";

type WithStyle = { style?: CSSProperties };

export function Logo({ color = "var(--ink)", size = 18 }: { color?: string; size?: number }) {
  return (
    <span className="wf-logo" style={{ color, fontSize: size }}>
      <svg width={size * 1.1} height={size * 1.1} viewBox="0 0 20 20" fill="none">
        <path
          d="M3,17 L6,3 L17,10 L9,11 L11,17 Z"
          fill={color}
          stroke={color}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </svg>
      PADEL<span style={{ fontSize: size * 0.7, opacity: 0.7 }}>39</span>
    </span>
  );
}

export function SketchBox({
  children,
  style,
  className = "",
  fill,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  className?: string;
  fill?: string;
  stroke?: string;
  sw?: number;
}) {
  return (
    <div
      className={"wf-box " + className}
      style={{ background: fill ?? "var(--paper)", ...style }}
    >
      {children}
    </div>
  );
}

export function Btn({
  children,
  primary,
  small,
  style,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  primary?: boolean;
  small?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={"wf-btn " + (primary ? "wf-btn-primary" : "")}
      style={{
        fontSize: small ? 13 : 15,
        padding: small ? "5px 10px" : "7px 14px",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Input({
  placeholder,
  value,
  box,
  style,
  width,
}: {
  placeholder?: string;
  value?: string;
  box?: boolean;
  style?: CSSProperties;
  width?: number | string;
}) {
  return (
    <div
      className={box ? "wf-input-box" : "wf-input"}
      style={{ width: width ?? "auto", ...style }}
    >
      {value ? <span style={{ color: "var(--ink)" }}>{value}</span> : placeholder}
    </div>
  );
}

export function Chip({
  children,
  green,
  onX,
  style,
}: {
  children: ReactNode;
  green?: boolean;
  onX?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className="wf-chip"
      style={green ? { background: "var(--green-tint)", color: "var(--green)", ...style } : style}
    >
      {children}
      {onX && <span style={{ opacity: 0.5, marginLeft: 2, fontSize: 11 }}>×</span>}
    </span>
  );
}

export function Placeholder({ label, style }: { label: string } & WithStyle) {
  return (
    <div className="wf-placeholder" style={style}>
      {label}
    </div>
  );
}

export function Divider() {
  return <div className="wf-divider" />;
}

export function Annotate({
  children,
  red,
  style,
}: {
  children: ReactNode;
  red?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={"wf-annotate " + (red ? "wf-annotate-red" : "")} style={style}>
      {children}
    </div>
  );
}

export function PhoneFrame({ children, style }: { children: ReactNode } & WithStyle) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
        padding: 10,
        borderRadius: 24,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--paper)",
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 6,
            left: "50%",
            transform: "translateX(-50%)",
            width: 60,
            height: 14,
            background: "#000",
            borderRadius: 8,
            zIndex: 10,
          }}
        />
        {children}
      </div>
    </div>
  );
}

export function Tag({
  children,
  color = "var(--accent-yellow)",
  rot = -2,
  style,
}: {
  children: ReactNode;
  color?: string;
  rot?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        background: color,
        fontFamily: "Poppins, sans-serif",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--ink)",
        transform: `rotate(${rot}deg)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
