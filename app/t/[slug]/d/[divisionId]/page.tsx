import { notFound } from "next/navigation";
import { divisionById, tournamentBySlug } from "@/app/lib/data";
import { DivisionSplitView } from "@/app/components/division-screens";
import { EmptyDivisionView } from "@/app/components/detail-screens";

type Params = Promise<{ slug: string; divisionId: string }>;
type SP = Promise<{ empty?: string }>;

export default async function DivisionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { slug, divisionId } = await params;
  const sp = await searchParams;
  const tournament = tournamentBySlug(slug);
  const division = divisionById(divisionId);
  if (!tournament || !division) notFound();

  if (sp.empty) return <EmptyDivisionView tournament={tournament} />;
  return <DivisionSplitView tournament={tournament} division={division} />;
}
