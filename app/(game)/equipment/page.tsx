"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { EquipmentInfo } from "@/components/equipment-info";
import { EquipmentAction } from "@/components/equipment-action";

export default function EquipmentPage() {
  return (
    <PageWrapper sidebar={<EquipmentInfo />}>
      <EquipmentAction />
    </PageWrapper>
  );
}
