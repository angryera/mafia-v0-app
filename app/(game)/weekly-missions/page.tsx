"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { WeeklyMissionInfo } from "@/components/weekly-mission-info";
import { WeeklyMissionGrid } from "@/components/weekly-mission-grid";

export default function WeeklyMissionsPage() {
  return (
    <PageWrapper sidebar={<WeeklyMissionInfo />}>
      <WeeklyMissionGrid />
    </PageWrapper>
  );
}
