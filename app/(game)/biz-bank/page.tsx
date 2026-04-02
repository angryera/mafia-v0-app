"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BankInfo } from "@/components/bank-info";
import { BankAction } from "@/components/bank-action";

export default function BankPage() {
  return (
    <PageWrapper sidebar={<BankInfo />}>
      <BankAction />
    </PageWrapper>
  );
}
