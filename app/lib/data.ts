export type Status = "Live" | "Draft" | "Scheduled" | "Done";
export type DBStatus = "LIVE" | "DRAFT" | "SCHEDULED" | "DONE";

export type TournamentRow = {
  id: string;
  name: string;
  slug: string;
  venue?: string;
  startDate: string;
  endDate: string;
  status: DBStatus;
  divisionCount: number;
  teamCount: number;
};

export function toDisplayStatus(s: DBStatus): Status {
  const map: Record<DBStatus, Status> = {
    LIVE: "Live", DRAFT: "Draft", SCHEDULED: "Scheduled", DONE: "Done",
  };
  return map[s];
}

export function fmtDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const mo = s.toLocaleString("en-US", { month: "short" });
  return s.toDateString() === e.toDateString()
    ? `${mo} ${s.getDate()}`
    : `${mo} ${s.getDate()}–${e.getDate()}`;
}

export type Tournament = {
  name: string;
  dates: string;
  divisions: number;
  teams: number;
  status: Status;
  slug: string;
};

export type DivisionFormat =
  | "Single Elim + Back Draw"
  | "Single Elim"
  | "Groups + Playoffs";

export type Division = {
  id: string;
  name: string;
  format: DivisionFormat;
  teams: number;
};

export type Team = {
  p1: string;
  p2: string;
  seed: number;
};

export const TOURNEYS: Tournament[] = [
  { name: "Spring Open 2026", dates: "May 2–4", divisions: 4, teams: 52, status: "Live", slug: "spring-open-2026" },
  { name: "Mixed Doubles Night", dates: "Apr 30", divisions: 2, teams: 16, status: "Draft", slug: "mix-night" },
  { name: "Club Championship", dates: "Jun 14–16", divisions: 6, teams: 96, status: "Scheduled", slug: "club-champ" },
  { name: "Ladies Weekend", dates: "May 18–19", divisions: 3, teams: 24, status: "Live", slug: "ladies" },
  { name: "Beginners Cup", dates: "Apr 26", divisions: 2, teams: 12, status: "Done", slug: "beginners" },
];

export const DIVISIONS: Division[] = [
  { id: "mens-a", name: "Men's A", format: "Groups + Playoffs", teams: 16 },
  { id: "mens-b", name: "Men's B", format: "Single Elim + Back Draw", teams: 12 },
  { id: "womens-a", name: "Women's A", format: "Single Elim", teams: 12 },
  { id: "mixed", name: "Mixed", format: "Groups + Playoffs", teams: 12 },
];

export const SAMPLE_TEAMS: Team[] = [
  { p1: "Maria Ruiz", p2: "Ana García", seed: 1 },
  { p1: "Carlos Lopez", p2: "Diego Torres", seed: 2 },
  { p1: "Sofia Mendez", p2: "Lucia Vega", seed: 3 },
  { p1: "Pedro Nava", p2: "Javier Ortiz", seed: 4 },
  { p1: "Isabel Cruz", p2: "Paula Díaz", seed: 5 },
  { p1: "Mateo Rojas", p2: "Santiago Paz", seed: 6 },
  { p1: "Elena Soto", p2: "Camila Luna", seed: 7 },
  { p1: "Andrés Vera", p2: "Rafael Pons", seed: 8 },
];

export function tournamentBySlug(slug: string): Tournament | undefined {
  return TOURNEYS.find((t) => t.slug === slug);
}

export function divisionById(id: string): Division | undefined {
  return DIVISIONS.find((d) => d.id === id);
}
