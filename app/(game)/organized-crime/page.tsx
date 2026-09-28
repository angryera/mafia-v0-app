import { PageWrapper } from "@/components/page-wrapper";
import { OrganizedCrimeInfo } from "@/components/organized-crime-info";
import { OrganizedCrimeAction } from "@/components/organized-crime-action";

export default function OrganizedCrimePage() {
  return (
    <PageWrapper>
      <div className="space-y-6">
        <OrganizedCrimeInfo />
        <OrganizedCrimeAction />
      </div>
    </PageWrapper>
  );
}
