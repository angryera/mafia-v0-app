"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BuyPerkboxInfo } from "@/components/buy-perkbox-info";
import { BuyPerkboxAction } from "@/components/buy-perkbox-action";

export default function BuyPerkBoxesPage() {
  return (
    <PageWrapper sidebar={<BuyPerkboxInfo />}>
      <BuyPerkboxAction />
    </PageWrapper>
  );
}
