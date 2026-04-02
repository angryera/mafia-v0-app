"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { CarCrusherInfo } from "@/components/car-crusher-info";
import { CarCrusherAction } from "@/components/car-crusher-action";

export default function CarCrusherPage() {
  return (
    <PageWrapper sidebar={<CarCrusherInfo />}>
      <CarCrusherAction />
    </PageWrapper>
  );
}
