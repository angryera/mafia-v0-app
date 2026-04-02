"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { DetectiveAgencyInfo } from "@/components/detective-agency-info";
import { DetectiveAgencyAction } from "@/components/detective-agency-action";

export default function DetectiveAgencyPage() {
  return (
    <PageWrapper sidebar={<DetectiveAgencyInfo />}>
      <DetectiveAgencyAction />
    </PageWrapper>
  );
}
