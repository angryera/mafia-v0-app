"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Legacy route — kill history now lives under /graveyard?tab=history */
export default function KillHistoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/graveyard?tab=history");
  }, [router]);

  return (
    <div className="flex justify-center py-16 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-red-400" />
    </div>
  );
}
