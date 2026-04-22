import { listTournaments } from "../lib/tournaments";
import { DashboardView, EmptyDashboardView } from "../components/dashboard-screens";

type SP = Promise<{ view?: string }>;

export default async function AdminDashboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tournaments = await listTournaments();
  if (tournaments.length === 0) return <EmptyDashboardView />;
  const initialMode = sp.view === "table" ? "table" : "cards";
  return <DashboardView tournaments={tournaments} initialMode={initialMode} />;
}
