"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { RacingInfo } from "@/components/racing-info";
import { RacingAction } from "@/components/racing-action";

export default function RacingPage() {
  return (
    <PageWrapper fullWidth>
      <div className="flex flex-col gap-6">
        <RacingInfo />
        <RacingAction />
      </div>
    </PageWrapper>
  );
}
