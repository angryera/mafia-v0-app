"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Shield } from "lucide-react";

/** Logo + wallet only — used for dead-account minimal layout and fullscreen gate. */
export function MinimalHeader() {
  return (
    <header className="sticky top-0 z-[1310] border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-4.5 w-4.5" />
          </div>
          <h1 className="text-sm font-bold tracking-tight text-foreground">
            Playmafia
          </h1>
        </Link>

        <ConnectButton
          accountStatus="address"
          chainStatus="none"
          showBalance={false}
        />
      </div>
    </header>
  );
}
