"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { OpenPerkBoxInfo } from "@/components/open-perkbox-info";
import { OpenPerkBoxAction } from "@/components/open-perkbox-action";

export default function OpenPerkBoxPage() {
  return (
    <PageWrapper sidebar={<OpenPerkBoxInfo />}>
      <OpenPerkBoxAction />
    </PageWrapper>
  );
}
