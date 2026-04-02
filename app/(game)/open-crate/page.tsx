"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { OpenCrateInfo } from "@/components/open-crate-info";
import { OpenCrateAction } from "@/components/open-crate-action";

export default function OpenCratePage() {
  return (
    <PageWrapper sidebar={<OpenCrateInfo />}>
      <OpenCrateAction />
    </PageWrapper>
  );
}
