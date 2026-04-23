import { PageWrapper } from "@/components/page-wrapper";
import { ExchangeOTCAction } from "@/components/exchange-otc-action";
import { ExchangeOTCInfo } from "@/components/exchange-otc-info";

export default function ExchangeOTCPage() {
  return (
    <PageWrapper sidebar={<ExchangeOTCInfo />}>
      <ExchangeOTCAction />
    </PageWrapper>
  );
}
