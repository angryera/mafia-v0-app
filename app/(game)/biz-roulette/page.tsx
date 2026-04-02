"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { RouletteInfo } from "@/components/roulette-info";
import { RouletteAction } from "@/components/roulette-action";

export default function RoulettePage() {
  return (
    <PageWrapper sidebar={<RouletteInfo />}>
      <RouletteAction />
    </PageWrapper>
  );
}
