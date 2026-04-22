import Link from "next/link";
import { Annotate, Btn, PhoneFrame, SketchBox } from "./primitives";
import type { Tournament } from "@/app/lib/data";

export function PublicLinkPanel({ tournament }: { tournament: Tournament }) {
  return (
    <>
      <Link
        href={`/t/${tournament.slug}`}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,30,25,0.25)",
          zIndex: 40,
        }}
        aria-label="Close share panel"
      />
      <div style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        background: "var(--paper)",
        borderLeft: "1.5px solid var(--line)",
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "auto",
        zIndex: 50,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 22 }}>Share with players</div>
            <div className="wf-hand muted" style={{ fontSize: 15, marginTop: 2 }}>
              Post this QR at the venue.
            </div>
          </div>
          <Link
            href={`/t/${tournament.slug}`}
            style={{ fontSize: 18, opacity: 0.5, cursor: "pointer", textDecoration: "none", color: "inherit" }}
          >
            ×
          </Link>
        </div>

        <SketchBox fill="#faf7f2" style={{ padding: 0 }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ width: 170, height: 170, position: "relative", background: "#faf7f2", padding: 8 }}>
              <div className="wf-qr" />
            </div>
            <div style={{
              fontFamily: "Poppins, sans-serif",
              fontSize: 11,
              color: "var(--ink)",
              textAlign: "center",
            }}>
              padel39.events/t/
              <span style={{ color: "var(--green)", fontWeight: 700 }}>{tournament.slug}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <Btn small>Copy link</Btn>
              <Btn small>Download PNG</Btn>
              <Btn small primary>Print page →</Btn>
            </div>
          </div>
        </SketchBox>

        <div>
          <div style={{
            fontFamily: "Poppins",
            fontSize: 13,
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>What players see on their phone</span>
            <span className="wf-hand muted" style={{ fontSize: 13 }}>read-only</span>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 130, height: 230 }}>
              <PhoneFrame>
                <div style={{ padding: 10, height: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ height: 18 }} />
                  <div className="wf-serif" style={{ fontSize: 11, textAlign: "center" }}>
                    {tournament.name}
                  </div>
                  <div className="wf-hand muted" style={{ fontSize: 10, textAlign: "center" }}>
                    Find your name
                  </div>
                  <div style={{
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    padding: "5px 7px",
                    fontSize: 9,
                    color: "var(--ink-muted)",
                    fontFamily: "Poppins",
                  }}>
                    🔍 Search...
                  </div>
                  <div style={{
                    flex: 1,
                    background: "var(--paper-2)",
                    borderRadius: 4,
                    padding: 6,
                    fontSize: 9,
                    fontFamily: "Poppins",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}>
                    <div>Maria Ruiz</div>
                    <div>Ana García</div>
                    <div style={{ color: "var(--ink-muted)" }}>Carlos Lopez</div>
                    <div style={{ color: "var(--ink-muted)" }}>Diego Torres</div>
                    <div style={{ color: "var(--ink-muted)" }}>Sofia Mendez</div>
                  </div>
                </div>
              </PhoneFrame>
            </div>
            <div style={{ flex: 1 }}>
              <Annotate>
                Mobile-first · QR goes straight here · name persists in localStorage after first visit
              </Annotate>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: "auto",
          padding: 12,
          background: "var(--paper-2)",
          borderRadius: 6,
          fontFamily: "Poppins",
          fontSize: 13,
          color: "var(--ink-muted)",
        }}>
          <div style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Public URL is live</div>
          Anyone with this link can view brackets &amp; order of play. No login required. No admin actions.
        </div>
      </div>
    </>
  );
}
