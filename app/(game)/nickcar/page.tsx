"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { NickCarInfo } from "@/components/nickcar-info";
import { NickCarAction } from "@/components/nickcar-action";

export default function NickCarPage() {
  return (
    <PageWrapper sidebar={<NickCarInfo />}>
      <NickCarAction />
    </PageWrapper>
  );
}
