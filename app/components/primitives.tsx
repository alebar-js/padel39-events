import type { CSSProperties, ReactNode } from "react";

type WithStyle = { style?: CSSProperties };

export function Logo({ color = "var(--ink)", size = 18 }: { color?: string; size?: number }) {
  return (
    <span className="wf-logo" style={{ display: "flex", alignItems: "center" }}>
      <svg 
        width={size * 9} 
        height={size * 3} 
        viewBox="0 0 245.51 86.61" 
        fill="none"
        style={{ color }}
      >
        <path
          d="M9.23.36l54.63,17.51c5.64,1.81,6.67,9.34,1.73,12.6L2.39,86.35c-1.47.97-3.15-.91-2.01-2.26L44.08,28.23c1.1-1.31.52-3.32-1.11-3.84l-23.28-7.41c-1.75-.56-3.45.97-3.08,2.77l6.65,17.19c.34,1.67-1.9,2.56-2.8,1.11L1.08,10.78C-2.37,5.21,2.99-1.65,9.23.36Z"
          fill={color}
        />
        <path
          d="M83.66,56.42c0,5.01-3.69,9.03-10.66,9.03h-8.09v6.32h-5.46v-24.42h13.54c6.97,0,10.66,4.07,10.66,9.08ZM78.2,56.42c0-2.43-2.07-4.4-5.15-4.4h-8.14v8.8h8.14c3.08,0,5.15-1.97,5.15-4.4Z"
          fill={color}
        />
        <path
          d="M83.93,71.76l11.17-24.42h6.21l11.22,24.42h-5.76l-8.54-18.67-8.54,18.67h-5.76Z"
          fill={color}
        />
        <path
          d="M143.25,59.55c0,6.74-5.1,12.21-14.05,12.21h-12.18v-24.42h12.18c8.95,0,14.05,5.47,14.05,12.21ZM137.69,59.55c0-4.12-2.73-7.49-8.64-7.49h-6.57v14.93h6.57c5.91,0,8.64-3.32,8.64-7.44Z"
          fill={color}
        />
        <path
          d="M154.11,51.83v5.47h14.1v4.49h-14.1v5.47h16.98v4.49h-22.14v-24.42h22.14v4.49h-16.98Z"
          fill={color}
        />
        <path
          d="M197.46,67.04v4.73h-19.66v-24.42h5.41v19.7h14.25Z"
          fill={color}
        />
        <path
          d="M221.54,65.23c0-2.42-1.83-4.52-4.91-5.62l-2.34-.84,2.34-.84c3.01-1.09,4.54-2.8,4.54-5.09,0-3.53-3.7-5.81-9.42-5.81-3.81,0-7.28,1.21-9.9,3.43l2.13,2.04c2.33-1.72,5.1-2.7,7.71-2.7,3.52,0,5.54,1.36,5.54,3.73s-3.04,4.27-6.92,4.27h-2.12v2.52h1.33c3.96,0,8.19,1.21,8.19,4.61,0,2.17-2.06,4.37-6.65,4.37-2.65,0-5.45-.95-7.65-2.58l-2.3,1.94c2.52,2.27,6.78,3.46,9.95,3.46,6.26,0,10.47-2.77,10.47-6.89Z"
          fill={color}
        />
        <path
          d="M245.51,58.53c0-7.1-4-11.5-10.45-11.5-5.72,0-10.03,3.42-10.03,7.96s3.65,7.66,8.87,7.66c2.62,0,5.05-.87,6.51-2.32l1.71-1.7-.2,2.4c-.44,5.32-3.49,8.25-8.59,8.25-1.79,0-3.76-.58-5.64-1.65l-1.7,2.33c1.46.89,4.15,2.16,7.6,2.16,7.57,0,11.91-4.95,11.91-13.59ZM234.9,60c-4.35,0-6.29-2.57-6.29-5.11,0-3.71,3.37-5.4,6.5-5.4,3.61,0,6.24,2.19,6.24,5.21,0,3.32-3.28,5.31-6.45,5.31Z"
          fill={color}
        />
      </svg>
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
