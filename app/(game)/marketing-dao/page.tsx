"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { MarketingDaoInfo } from "@/components/marketing-dao-info";
import { MarketingDaoAction } from "@/components/marketing-dao-action";

export default function MarketingDaoPage() {
  return (
    <PageWrapper sidebar={<MarketingDaoInfo />}>
      <MarketingDaoAction />
    </PageWrapper>
  );
}
