"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { GarageInfo } from "@/components/garage-info";
import { GarageAction } from "@/components/garage-action";

export default function GaragePage() {
  return (
    <PageWrapper fullWidth>
      <div className="flex flex-col gap-6">
        <GarageInfo />
        <GarageAction />
      </div>
    </PageWrapper>
  );
}
