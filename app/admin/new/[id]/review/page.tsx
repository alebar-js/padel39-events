import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import { Tournament } from "@/app/lib/models/Tournament";
import { Division } from "@/app/lib/models/Division";
import { Team } from "@/app/lib/models/Team";
import { SidebarNav, StatusChip } from "@/app/components/chrome";
import { Btn } from "@/app/components/primitives";
import { WizardStepper } from "@/app/components/wizard-stepper";
import { publishTournament } from "@/app/lib/actions/publishTournament";
import { fmtDateRange, toDisplayStatus } from "@/app/lib/data";

type Params = Promise<{ id: string }>;

export default async function ReviewStep({ params }: { params: Params }) {
  const { id } = await params;

  await connectDB();
  const oid = new mongoose.Types.ObjectId(id);
  const [tournament, divisions] = await Promise.all([
    Tournament.findById(oid).lean(),
    Division.find({ tournamentId: oid }).sort({ createdAt: 1 }).lean(),
  ]);

  if (!tournament) notFound();

  const teamCounts = await Promise.all(
    divisions.map((d) => Team.countDocuments({ divisionId: d._id }))
  );

  const dateRange = fmtDateRange(tournament.startDate.toISOString(), tournament.endDate.toISOString());
  const totalTeams = teamCounts.reduce((a, b) => a + b, 0);

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px 8px" }}>
          <Link href="/admin" className="muted" style={{ fontSize: 14, textDecoration: "none" }}>
            ← Tournaments / New
          </Link>
        </div>

        <WizardStepper current={3} />

        <div style={{ padding: "8px 24px 24px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
          <div>
            <div className="wf-serif" style={{ fontSize: 24, marginBottom: 4 }}>Review</div>
            <div className="muted" style={{ fontSize: 15, marginBottom: 20 }}>
              Everything look right? You can always edit after publishing.
            </div>

            {/* Tournament summary */}
            <div style={{
              padding: "16px 20px",
              border: "1px solid var(--line-soft)",
              borderRadius: 8,
              marginBottom: 20,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div className="wf-serif" style={{ fontSize: 20 }}>{tournament.name}</div>
                <StatusChip status={toDisplayStatus(tournament.status)} />
              </div>
              <div className="muted" style={{ fontSize: 14 }}>
                {dateRange}{tournament.venue ? ` · ${tournament.venue}` : ""}
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 4 }}>
                /t/{tournament.slug}
              </div>
            </div>

            {/* Divisions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {divisions.map((d, i) => (
                <div key={d._id.toString()} style={{
                  padding: "12px 16px",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div className="wf-serif" style={{ fontSize: 16 }}>{d.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {d.format === "SINGLE_ELIM_CONSOLATION" ? "Single Elim + Back Draw" : "Groups + Playoffs"}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>
                    {teamCounts[i]} team{teamCounts[i] !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
              <Link href={divisions.length > 0 ? `/admin/new/${id}/teams` : `/admin/new/${id}/divisions`} style={{ textDecoration: "none" }}>
                <Btn>← Back</Btn>
              </Link>
              <div style={{ display: "flex", gap: 8 }}>
                <form action={publishTournament}>
                  <input type="hidden" name="tournamentId" value={id} />
                  <input type="hidden" name="status" value="DRAFT" />
                  <Btn type="submit">Save as Draft</Btn>
                </form>
                <form action={publishTournament}>
                  <input type="hidden" name="tournamentId" value={id} />
                  <input type="hidden" name="status" value="LIVE" />
                  <Btn primary type="submit">Go Live →</Btn>
                </form>
              </div>
            </div>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                ["Tournament", tournament.name],
                ["Dates", dateRange],
                ["Venue", tournament.venue || "—"],
                ["Divisions", String(divisions.length)],
                ["Total teams", String(totalTeams)],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--paper-2)",
                  fontSize: 14,
                }}>
                  <span className="muted">{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
