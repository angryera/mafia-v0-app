"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { FamilyInfo } from "@/components/family-info";
import { FamilyTable } from "@/components/family-table";

export default function FamiliesPage() {
  return (
    <PageWrapper sidebar={<FamilyInfo />}>
      <FamilyTable />
    </PageWrapper>
  );
}
