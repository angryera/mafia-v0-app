"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BulletFactoryInfo } from "@/components/bulletfactory-info";
import { BulletFactoryAction } from "@/components/bulletfactory-action";

export default function BulletFactoryPage() {
  return (
    <PageWrapper sidebar={<BulletFactoryInfo />}>
      <BulletFactoryAction />
    </PageWrapper>
  );
}
