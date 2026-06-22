"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { KillAttemptAction } from "@/components/kill-attempt-action";

export default function KillAttemptPage() {
  return (
    <PageWrapper fullWidth hideHeader>
      <KillAttemptAction />
    </PageWrapper>
  );
}
