"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { LotteryHallInfo } from "@/components/lottery-hall-info";
import { LotteryHallAction } from "@/components/lottery-hall-action";

export default function LotteryHallPage() {
  return (
    <PageWrapper sidebar={<LotteryHallInfo />}>
      <LotteryHallAction />
    </PageWrapper>
  );
}
