"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { JackpotInfo } from "@/components/jackpot-info";
import { JackpotAction } from "@/components/jackpot-action";

export default function JackpotPage() {
  return (
    <PageWrapper sidebar={<JackpotInfo />}>
      <JackpotAction />
    </PageWrapper>
  );
}
