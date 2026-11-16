"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crosshair, Clock3 } from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { getKillOpenTime } from "@/lib/killContract";

function useUtcNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function KillOpenGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { activeChain } = useChain();
  const now = useUtcNow();
  const open = now !== null && now >= getKillOpenTime(activeChain);

  useEffect(() => {
    if (now !== null && !open) router.replace("/kill-start");
  }, [now, open, router]);

  return open ? <>{children}</> : null;
}

export function KillStartCountdown() {
  const router = useRouter();
  const { activeChain, chainConfig, setActiveChain } = useChain();
  const now = useUtcNow();
  const opensAt = getKillOpenTime(activeChain);
  const seconds = Math.max(0, opensAt - (now ?? opensAt));
  const units = [
    ["Days", Math.floor(seconds / 86400)],
    ["Hours", Math.floor((seconds % 86400) / 3600)],
    ["Minutes", Math.floor((seconds % 3600) / 60)],
    ["Seconds", seconds % 60],
  ] as const;

  useEffect(() => {
    if (now !== null && now >= opensAt) router.replace("/kill-initiation");
  }, [now, opensAt, router]);

  if (now === null) return <div className="px-4 py-12 text-center text-sm text-muted-foreground">Checking launch time…</div>;
  if (now >= opensAt) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-4 flex justify-end gap-2" aria-label="Countdown network">
        {(["bnb", "pulse"] as const).map((chain) => (
          <button key={chain} type="button" onClick={() => setActiveChain(chain)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${activeChain === chain ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {chain === "bnb" ? "BNB Chain" : "PulseChain"}
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-red-500/20 bg-card p-6 sm:p-10">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
          <Crosshair className="h-4 w-4" /> Combat / kill initiation
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Kill initiation opens soon.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {chainConfig.label} opens {new Date(opensAt * 1000).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "long", timeStyle: "short" })} UTC.
        </p>
        <div className="mt-8 grid grid-cols-4 gap-2 sm:gap-4" aria-label="UTC countdown">
          {units.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-background/60 p-3 text-center sm:p-5">
              <div className="font-mono text-2xl font-bold tabular-nums text-foreground sm:text-4xl">
                {String(value).padStart(2, "0")}
              </div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-border pt-6">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground"><Clock3 className="h-4 w-4 text-amber-400" /> Prepare for combat</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {[
              ["Train kill skill", "/killskill"],
              ["Make bullets", "/biz-bulletfactory"],
              ["Equip a weapon", "/equipment"],
              ["Activate rank", "/rank-activation"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-lg border border-border bg-background/50 px-3 py-2 text-primary transition-colors hover:border-primary/40">
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
