"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { TravelInfo } from "@/components/travel-info";
import { TravelGrid } from "@/components/travel-grid";

export default function TravelPage() {
  return (
    <PageWrapper sidebar={<TravelInfo />}>
      <TravelGrid />
    </PageWrapper>
  );
}
