"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { KillInitiationAction } from "@/components/kill-initiation-action";
import { KillOpenGate } from "@/components/kill-open-gate";

export default function KillInitiationPage() {
  return (
    <KillOpenGate>
      <PageWrapper fullWidth hideHeader>
        <KillInitiationAction />
      </PageWrapper>
    </KillOpenGate>
  );
}
