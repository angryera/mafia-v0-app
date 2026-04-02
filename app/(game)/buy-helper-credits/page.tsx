"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BuyCreditsInfo } from "@/components/buy-credits-info";
import { BuyCreditsAction } from "@/components/buy-credits-action";

export default function BuyHelperCreditsPage() {
  return (
    <PageWrapper sidebar={<BuyCreditsInfo />}>
      <BuyCreditsAction />
    </PageWrapper>
  );
}
