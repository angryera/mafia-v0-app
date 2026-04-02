"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { ContractInfo } from "@/components/contract-info";
import { CrimeGrid } from "@/components/crime-grid";

export default function CrimePage() {
  return (
    <PageWrapper sidebar={<ContractInfo />}>
      <CrimeGrid />
    </PageWrapper>
  );
}
