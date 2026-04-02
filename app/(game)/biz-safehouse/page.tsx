"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { SafehouseInfo } from "@/components/safehouse-info";
import { SafehouseAction } from "@/components/safehouse-action";

export default function SafehousePage() {
  return (
    <PageWrapper sidebar={<SafehouseInfo />}>
      <SafehouseAction />
    </PageWrapper>
  );
}
