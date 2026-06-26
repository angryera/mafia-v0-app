"use client";

import { Crosshair, ShieldAlert, Search, MapPin, Clock, Swords } from "lucide-react";

export function KillInitiationInfo() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
          <Crosshair className="h-4 w-4" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Kill Initiation</h2>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Before an attack is allowed, your target must pass every check below. The
        on-chain kill contract is not deployed yet — confirming runs a validated
        preview only.
      </p>

      <div className="flex flex-col gap-2.5">
        <Requirement
          icon={<Swords className="h-3.5 w-3.5 text-red-400" />}
          title="Weapon equipped"
          text="You must have a weapon equipped in your current city before you can attack."
        />
        <Requirement
          icon={<Search className="h-3.5 w-3.5 text-amber-400" />}
          title="Located via detectives"
          text="Hire detectives and reveal the target's location at the Detective Agency."
        />
        <Requirement
          icon={<MapPin className="h-3.5 w-3.5 text-amber-400" />}
          title="Same city"
          text="You must be in the same city as your located target."
        />
        <Requirement
          icon={<Clock className="h-3.5 w-3.5 text-amber-400" />}
          title="Active kill window"
          text="The located target's kill window must not have expired."
        />
        <Requirement
          icon={<ShieldAlert className="h-3.5 w-3.5 text-red-400" />}
          title="Not in safehouse"
          text="A target hiding in the safehouse cannot be attacked."
        />
      </div>

      <div className="mt-4 rounded-lg bg-background/50 px-3 py-2.5">
        <p className="mb-0.5 text-xs text-muted-foreground">Write (mock)</p>
        <p className="break-all font-mono text-sm text-primary">
          initiateKill(address,uint256)
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Pending deployment of the MafiaKill contract.
        </p>
      </div>
    </div>
  );
}

function Requirement({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg bg-background/50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        {icon}
        {title}
      </p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
        {text}
      </p>
    </div>
  );
}
