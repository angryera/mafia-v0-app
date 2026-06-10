"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { KillHistoryAction } from "@/components/kill-history-action";

export default function KillHistoryPage() {
  return (
    <PageWrapper fullWidth hideHeader>
      <KillHistoryAction />
    </PageWrapper>
  );
}
