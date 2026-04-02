"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { PremiumInfo } from "@/components/premium-info";
import { PremiumAction } from "@/components/premium-action";

export default function BuyPremiumPage() {
  return (
    <PageWrapper sidebar={<PremiumInfo />}>
      <PremiumAction />
    </PageWrapper>
  );
}
