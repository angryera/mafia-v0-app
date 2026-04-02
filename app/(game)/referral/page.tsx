"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { ReferralAction } from "@/components/referral-action";
import { ReferralInfo } from "@/components/referral-info";

export default function ReferralPage() {
  return (
    <PageWrapper sidebar={<ReferralInfo />}>
      <ReferralAction />
    </PageWrapper>
  );
}
