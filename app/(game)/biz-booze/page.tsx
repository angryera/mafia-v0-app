"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BoozeInfo } from "@/components/booze-info";
import { BoozeAction } from "@/components/booze-action";

export default function BoozePage() {
  return (
    <PageWrapper sidebar={<BoozeInfo />}>
      <BoozeAction />
    </PageWrapper>
  );
}
