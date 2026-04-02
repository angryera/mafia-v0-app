"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { HelperBotInfo } from "@/components/helperbot-info";
import { HelperBotGrid } from "@/components/helperbot-grid";

export default function HelperBotsPage() {
  return (
    <PageWrapper sidebar={<HelperBotInfo />}>
      <HelperBotGrid />
    </PageWrapper>
  );
}
