"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BuyGiCreditsInfo } from "@/components/buy-gi-credits-info";
import { BuyGiCreditsAction } from "@/components/buy-gi-credits-action";

export default function BuyGiCreditsPage() {
  return (
    <PageWrapper sidebar={<BuyGiCreditsInfo />}>
      <BuyGiCreditsAction />
    </PageWrapper>
  );
}
