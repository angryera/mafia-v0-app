import { PageWrapper } from "@/components/page-wrapper";
import { ExchangeConvertAction } from "@/components/exchange-convert-action";
import { ExchangeConvertInfo } from "@/components/exchange-convert-info";

export default function ExchangeConvertPage() {
  return (
    <PageWrapper sidebar={<ExchangeConvertInfo />}>
      <ExchangeConvertAction />
    </PageWrapper>
  );
}
