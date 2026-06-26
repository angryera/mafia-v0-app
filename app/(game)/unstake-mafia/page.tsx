"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { UnstakeMafiaAction } from "@/components/unstake-mafia-action";

export default function UnstakeMafiaPage() {
  return (
    <PageWrapper fullWidth hideHeader>
      <UnstakeMafiaAction />
    </PageWrapper>
  );
}
