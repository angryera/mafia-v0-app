"use client";

import React from "react";
import { useAccount, useReadContract } from "wagmi";
import { useChainAddresses } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  OC_LOBBY_ABI,
  OC_LOBBY_STATUS_LABELS,
  OC_MIN_HEALTH,
  HEALTH_ABI,
} from "@/lib/contract";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Heart,
} from "lucide-react";
import { formatEther } from "viem";

export function OrganizedCrimeInfo() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { authData } = useAuth();

  // Check if user is in a lobby
  const { data: isInLobbyRaw } = useReadContract({
    address: addresses.ocLobby,
    abi: OC_LOBBY_ABI,
    functionName: "isInLobby",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });
  const isInLobby = Boolean(isInLobbyRaw);

  // Get user's current lobby ID
  const { data: currentLobbyIdRaw } = useReadContract({
    address: addresses.ocLobby,
    abi: OC_LOBBY_ABI,
    functionName: "getUserCurrentLobbyId",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected && isInLobby },
  });
  const currentLobbyId = currentLobbyIdRaw !== undefined ? Number(currentLobbyIdRaw) : null;

  // Get next lobby time
  const { data: nextLobbyTimeRaw } = useReadContract({
    address: addresses.ocLobby,
    abi: OC_LOBBY_ABI,
    functionName: "nextLobbyTime",
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected },
  });
  const nextLobbyTime = nextLobbyTimeRaw !== undefined ? Number(nextLobbyTimeRaw) : 0;



  // Get health balance
  const { data: healthBalanceRaw } = useReadContract({
    address: addresses.health,
    abi: HEALTH_ABI,
    functionName: "balanceOf",
    args: authData && address ? [address, authData.message, authData.signature] : undefined,
    query: { enabled: !!authData && !!address && isConnected },
  });
  const healthBalance = healthBalanceRaw !== undefined
    ? Number(formatEther(healthBalanceRaw as bigint))
    : null;

  const now = Math.floor(Date.now() / 1000);
  const isOnCooldown = nextLobbyTime > now;
  const cooldownRemaining = isOnCooldown ? nextLobbyTime - now : 0;
  const hasEnoughHealth = healthBalance !== null && healthBalance >= OC_MIN_HEALTH;

  const formatCooldown = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Users className="h-5 w-5" />
          <span>Connect wallet to view organized crime status</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Current Lobby Status */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isInLobby ? "bg-amber-500/10" : "bg-green-500/10"
            }`}>
              {isInLobby ? (
                <Clock className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lobby Status</p>
              <p className={`text-sm font-medium ${
                isInLobby ? "text-amber-500" : "text-green-500"
              }`}>
                {isInLobby ? `In Lobby #${currentLobbyId}` : "Not in a lobby"}
              </p>
            </div>
          </div>
        </div>

        {/* Cooldown */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isOnCooldown ? "bg-red-500/10" : "bg-green-500/10"
            }`}>
              <Timer className={`h-5 w-5 ${isOnCooldown ? "text-red-500" : "text-green-500"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cooldown</p>
              <p className={`text-sm font-medium ${
                isOnCooldown ? "text-red-500" : "text-green-500"
              }`}>
                {isOnCooldown ? formatCooldown(cooldownRemaining) : "Ready"}
              </p>
            </div>
          </div>
        </div>

        {/* Health Status */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              hasEnoughHealth ? "bg-green-500/10" : "bg-red-500/10"
            }`}>
              <Heart className={`h-5 w-5 ${hasEnoughHealth ? "text-green-500" : "text-red-500"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Health</p>
              <p className={`text-sm font-medium ${
                hasEnoughHealth ? "text-green-500" : "text-red-500"
              }`}>
                {healthBalance !== null ? `${Math.floor(healthBalance).toLocaleString()} / ${OC_MIN_HEALTH}` : "..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(!hasEnoughHealth || isOnCooldown) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="space-y-1">
              {!hasEnoughHealth && (
                <p className="text-sm text-amber-200">
                  You need at least {OC_MIN_HEALTH} health to participate in organized crime.
                </p>
              )}
              {isOnCooldown && (
                <p className="text-sm text-amber-200">
                  You must wait {formatCooldown(cooldownRemaining)} before creating or joining a lobby.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
