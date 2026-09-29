import { PageWrapper } from "@/components/page-wrapper";
import { FtsPage } from "@/features/fts/components/fts-page";

export const metadata = {
  title: "Founders table shares",
  description: "Auction, transfer, and subscribe founder table shares.",
};

export default function FoundersTableSharesPage() {
  return (
    <PageWrapper hideHeader>
      <FtsPage />
    </PageWrapper>
  );
}
