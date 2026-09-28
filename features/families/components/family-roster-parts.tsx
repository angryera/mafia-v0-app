"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatWalletAddress } from "@/lib/format";
import { Check, Copy, Crown, Lock, Shield, Skull, User } from "lucide-react";
import { useEffect, useState } from "react";

const ROLE_STYLES: Record<string, { icon: string; badge: string }> = {
  Don: { icon: "text-yellow-500", badge: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" },
  Consigliere: { icon: "text-purple-500", badge: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
  Capodecina: { icon: "text-blue-500", badge: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
  Capo: { icon: "text-cyan-500", badge: "border-cyan-500/50 bg-cyan-500/10 text-cyan-400" },
  Heir: { icon: "text-amber-500", badge: "border-amber-500/50 bg-amber-500/10 text-amber-400" },
};

const DEFAULT_ROLE_BADGE = "border-muted-foreground/50 text-muted-foreground";

export function getRoleBadgeClass(role: string): string {
  return ROLE_STYLES[role]?.badge ?? DEFAULT_ROLE_BADGE;
}

export function RoleIcon({ role }: { role: string }) {
  const style = ROLE_STYLES[role];
  if (!style) return <User className="h-3.5 w-3.5 text-muted-foreground" />;
  const Icon = role === "Don" ? Crown : Shield;
  return <Icon className={cn("h-3.5 w-3.5", style.icon)} />;
}

export function StatusIndicators({ isJailed, isDead }: { isJailed: boolean; isDead: boolean }) {
  if (!isJailed && !isDead) return null;
  return (
    <span className="ml-1 inline-flex gap-1">
      {isJailed && <Lock className="h-3 w-3 text-amber-500" aria-label="Jailed" />}
      {isDead && <Skull className="h-3 w-3 text-red-500" aria-label="Dead" />}
    </span>
  );
}

export function MemberStatusBadge({ isJailed, isDead }: { isJailed: boolean; isDead: boolean }) {
  const [label, className] = isDead
    ? ["Dead", "border-red-500/50 bg-red-500/10 text-red-400"]
    : isJailed
      ? ["Jailed", "border-amber-500/50 bg-amber-500/10 text-amber-400"]
      : ["Active", "border-green-500/50 bg-green-500/10 text-green-400"];
  return (
    <Badge variant="outline" className={cn("text-[10px]", className)}>
      {label}
    </Badge>
  );
}

const COPIED_FEEDBACK_MS = 2000;

export function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      title={address}
    >
      {formatWalletAddress(address)}
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}
