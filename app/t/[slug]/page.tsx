import { notFound } from "next/navigation";
import { tournamentBySlug } from "@/app/lib/data";
import { TournamentDetailView } from "@/app/components/detail-screens";
import { PublicLinkPanel } from "@/app/components/share-panel";

type Params = Promise<{ slug: string }>;
type SP = Promise<{ share?: string }>;

export default async function TournamentPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tournament = tournamentBySlug(slug);
  if (!tournament) notFound();

  return (
    <>
      <TournamentDetailView tournament={tournament} />
      {sp.share && <PublicLinkPanel tournament={tournament} />}
    </>
  );
}
