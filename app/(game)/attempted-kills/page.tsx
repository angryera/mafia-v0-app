"use client";

import { Suspense } from "react";
import { PageWrapper } from "@/components/page-wrapper";
import { KillAttemptAction } from "@/components/kill-attempt-action";
import { Loader2 } from "lucide-react";

export default function AttemptedKillsPage() {
  return <PageWrapper fullWidth hideHeader><Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>}><KillAttemptAction /></Suspense></PageWrapper>;
}
