"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { KillSkillInfo } from "@/components/killskill-info";
import { KillSkillGrid } from "@/components/killskill-grid";

export default function KillSkillPage() {
  return (
    <PageWrapper sidebar={<KillSkillInfo />}>
      <KillSkillGrid />
    </PageWrapper>
  );
}
