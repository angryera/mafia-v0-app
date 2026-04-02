"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { XpMarketInfo } from "@/components/xp-market-info";
import { XpMarketAction } from "@/components/xp-market-action";

export default function XpMarketPage() {
  return (
    <PageWrapper sidebar={<XpMarketInfo />}>
      <XpMarketAction />
    </PageWrapper>
  );
}
