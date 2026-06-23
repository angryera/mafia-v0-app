"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { KillOutcomeAction } from "@/components/kill-outcome-action";

function KillOutcomeFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[#c44b4b]" />
    </div>
  );
}

export default function KillOutcomePage() {
  return (
    <PageWrapper hideHeader fullWidth>
      <Suspense fallback={<KillOutcomeFallback />}>
        <KillOutcomeAction />
      </Suspense>
    </PageWrapper>
  );
}
