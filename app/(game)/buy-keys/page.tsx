"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BuyKeysInfo } from "@/components/buy-keys-info";
import { BuyKeysAction } from "@/components/buy-keys-action";

export default function BuyKeysPage() {
  return (
    <PageWrapper sidebar={<BuyKeysInfo />}>
      <BuyKeysAction />
    </PageWrapper>
  );
}
