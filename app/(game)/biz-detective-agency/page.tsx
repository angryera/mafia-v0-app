"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { DetectiveAgencyAction } from "@/components/detective-agency-action";

export default function DetectiveAgencyPage() {
  return (
    <PageWrapper fullWidth hideHeader hideFooter>
      <DetectiveAgencyAction />
    </PageWrapper>
  );
}
