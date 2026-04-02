"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { HospitalInfo } from "@/components/hospital-info";
import { HospitalAction } from "@/components/hospital-action";

export default function HospitalPage() {
  return (
    <PageWrapper sidebar={<HospitalInfo />}>
      <HospitalAction />
    </PageWrapper>
  );
}
