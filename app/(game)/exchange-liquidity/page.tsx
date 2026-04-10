import { PageWrapper } from "@/components/page-wrapper";
import { ExchangeLiquidityAction } from "@/components/exchange-liquidity-action";
import { ExchangeLiquidityInfo } from "@/components/exchange-liquidity-info";

export default function ExchangeLiquidityPage() {
  return (
    <PageWrapper sidebar={<ExchangeLiquidityInfo />}>
      <ExchangeLiquidityAction />
    </PageWrapper>
  );
}
