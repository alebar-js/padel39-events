import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import { Tournament } from "@/app/lib/models/Tournament";
import { Division } from "@/app/lib/models/Division";
import { Team } from "@/app/lib/models/Team";
import { Match } from "@/app/lib/models/Match";
import { Court } from "@/app/lib/models/Court";
import { TournamentDay } from "@/app/lib/models/TournamentDay";
import { ensureTournamentSchedule } from "@/app/lib/actions/schedule";
import { SidebarNav } from "@/app/components/chrome";
import { ScheduleGrid } from "./client";
import ScheduleClient from "./schedule-client";

type Params = Promise<{ slug: string }>;

export type CourtRow = { id: string; name: string; order: number };

export type DayRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  courtIds: string[];
};

export type MatchRow = {
  id: string;
  divisionId: string;
  divisionName: string;
  round: string;
  bracketSlot: number | null;
  isConsolation: boolean;
  team1: string | null;
  team2: string | null;
  team1Id: string | null;
  team2Id: string | null;
  courtId: string | null;
  scheduledTime: string | null;
};

export type DivisionRow = { id: string; name: string; format: string; slug: string };

export default async function SchedulePage({ params }: { params: Params }) {
  const { slug } = await params;

  await connectDB();
  const tournament = await Tournament.findOne({ slug }).lean();
  if (!tournament) notFound();

  const tId = tournament._id as mongoose.Types.ObjectId;

  await ensureTournamentSchedule(tId.toString());

  const [divisions, courts, days] = await Promise.all([
    Division.find({ tournamentId: tId }).sort({ createdAt: 1 }).lean(),
    Court.find({ tournamentId: tId }).sort({ order: 1 }).lean(),
    TournamentDay.find({ tournamentId: tId }).sort({ date: 1 }).lean(),
  ]);

  const divisionIds = divisions.map((d) => d._id);

  const [matches, teams] = await Promise.all([
    Match.find({ divisionId: { $in: divisionIds } }).lean(),
    Team.find({ divisionId: { $in: divisionIds } }).lean(),
  ]);

  const teamMap: Record<string, string> = {};
  for (const t of teams) {
    teamMap[t._id.toString()] = `${t.player1} / ${t.player2}`;
  }

  const divMap: Record<string, string> = {};
  for (const d of divisions) {
    divMap[d._id.toString()] = d.name;
  }

  const courtRows: CourtRow[] = courts.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    order: c.order,
  }));

  const dayRows: DayRow[] = days.map((d) => ({
    id: d._id.toString(),
    date: d.date.toISOString(),
    startTime: d.startTime,
    endTime: d.endTime,
    slotMinutes: d.slotMinutes,
    courtIds: (d.courtIds ?? []).map((id) => id.toString()),
  }));

  const matchRows: MatchRow[] = matches.map((m) => ({
    id: m._id.toString(),
    divisionId: m.divisionId.toString(),
    divisionName: divMap[m.divisionId.toString()] ?? "—",
    round: m.round,
    bracketSlot: m.bracketSlot ?? null,
    isConsolation: m.isConsolation,
    team1: m.team1Id ? (teamMap[m.team1Id.toString()] ?? null) : null,
    team2: m.team2Id ? (teamMap[m.team2Id.toString()] ?? null) : null,
    team1Id: m.team1Id?.toString() ?? null,
    team2Id: m.team2Id?.toString() ?? null,
    courtId: m.courtId?.toString() ?? null,
    scheduledTime: m.scheduledTime?.toISOString() ?? null,
  }));

  const divisionRows: DivisionRow[] = divisions.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    format: d.format,
    slug,
  }));

  return (
    <div className="wf screen" style={{ flexDirection: "row" }}>
      <SidebarNav />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <ScheduleClient
          tournamentName={tournament.name}
          tournamentSlug={slug}
          courts={courtRows}
          days={dayRows}
          matches={matchRows}
          divisions={divisionRows}
          tournamentId={tId.toString()}
        />
      </div>
    </div>
  );
}
