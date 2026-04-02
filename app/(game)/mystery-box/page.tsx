"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { MysteryBoxInfo } from "@/components/mystery-box-info";
import { MysteryBoxAction } from "@/components/mystery-box-action";

export default function MysteryBoxPage() {
  return (
    <PageWrapper sidebar={<MysteryBoxInfo />}>
      <MysteryBoxAction />
    </PageWrapper>
  );
}
