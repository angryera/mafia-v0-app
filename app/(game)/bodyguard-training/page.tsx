"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BodyguardTrainingInfo } from "@/components/bodyguard-training-info";
import { BodyguardTrainingAction } from "@/components/bodyguard-training-action";

export default function BodyguardTrainingPage() {
  return (
    <PageWrapper sidebar={<BodyguardTrainingInfo />}>
      <BodyguardTrainingAction />
    </PageWrapper>
  );
}
