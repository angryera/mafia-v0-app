import { PageWrapper } from "@/components/page-wrapper";
import { MarketplaceAction } from "@/components/marketplace-action";
import { MarketplaceInfo } from "@/components/marketplace-info";

export const metadata = {
  title: "Marketplace | Mafia",
  description: "Trade inventory items with other players",
};

export default function MarketplacePage() {
  return (
    <PageWrapper
      title="Marketplace"
      description="Browse and trade inventory items with other players"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MarketplaceAction />
        </div>
        <div>
          <MarketplaceInfo />
        </div>
      </div>
    </PageWrapper>
  );
}
