"use client";

import { use } from "react";
import { usePathname } from "next/navigation";
import { ShellLayout } from "@/components/shell-layout";
import { FamilyDetail } from "@/components/family-detail";
import { useChain } from "@/components/chain-provider";

export default function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const familyId = parseInt(id, 10);
  const { chainConfig } = useChain();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
      {/* Page header */}
      <section className="mb-8">
        <h2 className="text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Family Details
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
          View detailed information about this mafia family including leadership, members, and status.
        </p>
      </section>

      <FamilyDetail familyId={familyId} />

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="text-center text-xs text-muted-foreground">
            {`Playmafia App on ${chainConfig.label}`}
          </p>
        </div>
      </footer>
    </div>
  );
}
