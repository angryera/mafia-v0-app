"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { NarcsInfo } from "@/components/narcs-info";
import { NarcsAction } from "@/components/narcs-action";

export default function NarcsPage() {
  return (
    <PageWrapper sidebar={<NarcsInfo />}>
      <NarcsAction />
    </PageWrapper>
  );
}
