import { PageWrapper } from "@/components/page-wrapper";
import { OrganizedCrimeDetail } from "@/components/organized-crime-detail";

export default async function OrganizedCrimeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lobbyId = parseInt(id, 10);

  if (isNaN(lobbyId) || lobbyId < 0) {
    return (
      <PageWrapper title="Invalid Lobby" description="The lobby ID is invalid.">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Invalid lobby ID provided.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={`Lobby #${lobbyId}`}
      description="View and manage organized crime lobby"
    >
      <OrganizedCrimeDetail lobbyId={lobbyId} />
    </PageWrapper>
  );
}
