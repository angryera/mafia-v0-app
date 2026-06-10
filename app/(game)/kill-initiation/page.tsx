"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { KillInitiationInfo } from "@/components/kill-initiation-info";
import { KillInitiationAction } from "@/components/kill-initiation-action";

export default function KillInitiationPage() {
  return (
    <PageWrapper sidebar={<KillInitiationInfo />}>
      <KillInitiationAction />
    </PageWrapper>
  );
}
