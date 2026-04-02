"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { SlotMachineInfo } from "@/components/slotmachine-info";
import { SlotMachineAction } from "@/components/slotmachine-action";

export default function SlotMachinePage() {
  return (
    <PageWrapper sidebar={<SlotMachineInfo />}>
      <SlotMachineAction />
    </PageWrapper>
  );
}
