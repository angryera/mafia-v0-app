"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { JailInfo } from "@/components/jail-info";
import { JailAction } from "@/components/jail-action";

export default function JailPage() {
  return (
    <PageWrapper sidebar={<JailInfo />}>
      <JailAction />
    </PageWrapper>
  );
}
