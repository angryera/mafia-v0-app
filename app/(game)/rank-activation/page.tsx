"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { RankActivationInfo } from "@/components/rank-activation-info";
import { RankActivationAction } from "@/components/rank-activation-action";

export default function RankActivationPage() {
  return (
    <PageWrapper sidebar={<RankActivationInfo />}>
      <RankActivationAction />
    </PageWrapper>
  );
}
