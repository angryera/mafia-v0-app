"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { BackfireSettingsAction } from "@/components/backfire-settings-action";

export default function BackfireSettingsPage() {
  return (
    <PageWrapper fullWidth hideHeader>
      <BackfireSettingsAction />
    </PageWrapper>
  );
}
