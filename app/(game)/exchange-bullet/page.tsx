import { PageWrapper } from "@/components/page-wrapper";
import { ExchangeBulletInfo } from "@/components/exchange-bullet-info";
import { ExchangeBulletAction } from "@/components/exchange-bullet-action";

export default function ExchangeBulletPage() {
  return (
    <PageWrapper sidebar={<ExchangeBulletInfo />}>
      <ExchangeBulletAction />
    </PageWrapper>
  );
}
