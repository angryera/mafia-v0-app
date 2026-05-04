import { PageWrapper } from "@/components/page-wrapper";
import { ExchangeBulletAction } from "@/components/exchange-bullet-action";
import { ExchangeBulletInfo } from "@/components/exchange-bullet-info";

export default function ExchangeBulletPage() {
  return (
    <PageWrapper sidebar={<ExchangeBulletInfo />}>
      <ExchangeBulletAction />
    </PageWrapper>
  );
}
