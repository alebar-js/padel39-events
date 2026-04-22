import Link from "next/link";
import { Annotate, Btn, Input, SketchBox } from "./primitives";
import { SidebarNav } from "./chrome";
import { RosterTable } from "./detail-screens";
import type { Division, Tournament } from "@/app/lib/data";

export function DivisionSplitView({
  tournament,
  division,
}: {
  tournament: Tournament;
  division: Division;
}) {
  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 24px 4px" }}>
          <Link
            href={`/t/${tournament.slug}`}
            className="wf-hand muted"
            style={{ fontSize: 14, textDecoration: "none" }}
          >
            ← {tournament.name} / {division.name}
          </Link>
        </div>
        <div style={{
          padding: "4px 24px 10px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 24 }}>
              {division.name} — Roster
            </div>
            <div className="wf-hand muted" style={{ fontSize: 15, marginTop: 2 }}>
              14 of {division.teams} teams added · 2 to go
            </div>
          </div>
          <Btn small primary>Save &amp; generate bracket →</Btn>
        </div>

        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          borderTop: "1px solid var(--paper-2)",
        }}>
          <div style={{ padding: 20, borderRight: "1px dashed var(--line-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 15 }}>1 · Type a pair</div>
              <span className="wf-hand muted" style={{ fontSize: 14 }}>quick one-offs</span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 20 }}>
              <Input box placeholder="Player 1" style={{ flex: 1 }} />
              <span className="muted">&amp;</span>
              <Input box placeholder="Player 2" style={{ flex: 1 }} />
              <Btn small primary>+ Add</Btn>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 15 }}>2 · Paste a list</div>
              <span className="wf-hand muted" style={{ fontSize: 14 }}>one pair per line</span>
            </div>
            <div style={{
              border: "1.5px solid var(--line)",
              borderRadius: 6,
              padding: 12,
              minHeight: 180,
              background: "var(--paper)",
              fontFamily: "Poppins, sans-serif",
              fontSize: 11,
              lineHeight: 1.7,
            }}>
              <div>Maria Ruiz, Ana García</div>
              <div>Carlos Lopez, Diego Torres</div>
              <div>Sofia Mendez, Lucia Vega</div>
              <div>Pedro Nava &amp; Javier Ortiz</div>
              <div style={{ color: "var(--ink-muted)" }}>Isabel Cruz / Paula Díaz</div>
              <div style={{ color: "var(--accent-orange)" }}>Mateo Rojas ← incomplete pair</div>
              <div>│</div>
            </div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
            }}>
              <span className="wf-hand muted" style={{ fontSize: 13 }}>
                Accepts commas, &amp;, /, or tabs as separators
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small>Upload CSV</Btn>
                <Btn small primary>Parse 5 pairs</Btn>
              </div>
            </div>

            <Annotate style={{ marginTop: 16 }}>
              ↑ Live-parsing catches orphans, dupes, and typos before commit
            </Annotate>
          </div>

          <div style={{ padding: 20, background: "var(--paper-2)" }}>
            <div style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 10,
            }}>
              <div style={{ fontFamily: "Poppins", fontWeight: 700, fontSize: 15 }}>Current roster</div>
              <span className="wf-hand muted" style={{ fontSize: 13 }}>drag # to reseed</span>
            </div>
            <SketchBox fill="#faf7f2" style={{ padding: 0 }}>
              <RosterTable />
            </SketchBox>

            <div style={{
              marginTop: 14,
              padding: 12,
              background: "var(--paper)",
              border: "1.5px dashed var(--green)",
              borderRadius: 6,
            }}>
              <div className="wf-hand" style={{
                fontSize: 15,
                color: "var(--green)",
                fontWeight: 600,
                marginBottom: 6,
              }}>
                + 3 pending from paste
              </div>
              <div style={{ fontFamily: "Poppins", fontSize: 13, lineHeight: 1.7 }}>
                <div>· Pedro Nava &amp; Javier Ortiz</div>
                <div>· Isabel Cruz &amp; Paula Díaz</div>
                <div style={{ color: "var(--accent-orange)" }}>
                  · Mateo Rojas &amp; ??? <span className="muted">needs partner</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
