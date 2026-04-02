"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { ShopInfo } from "@/components/shop-info";
import { ShopAction } from "@/components/shop-action";

export default function ShopPage() {
  return (
    <PageWrapper sidebar={<ShopInfo />}>
      <ShopAction />
    </PageWrapper>
  );
}
