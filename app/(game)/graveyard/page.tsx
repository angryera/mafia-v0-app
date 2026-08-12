"use client";

import { Suspense } from "react";
import { PageWrapper } from "@/components/page-wrapper";
import { GraveyardPageAction } from "@/components/graveyard-page-action";
import { Loader2 } from "lucide-react";

export default function GraveyardPage() {
  return (
    <PageWrapper fullWidth hideHeader>
      <Suspense
        fallback={
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-red-400" />
          </div>
        }
      >
        <GraveyardPageAction />
      </Suspense>
    </PageWrapper>
  );
}
