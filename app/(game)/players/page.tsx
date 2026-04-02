"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { PlayersInfo } from "@/components/players-info";
import { PlayersAction } from "@/components/players-action";

export default function PlayersPage() {
  return (
    <PageWrapper sidebar={<PlayersInfo />}>
      <PlayersAction />
    </PageWrapper>
  );
}
