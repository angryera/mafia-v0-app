"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useChain } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import {
  DollarSign,
  Loader2,
  AlertCircle,
  User,
  Briefcase,
  TrendingUp,
  RefreshCw,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

declare global {
  interface Window {
    MafiaWorth?: {
      computeWorth: (params: {
        chain: string;
        player: string;
        signMsg: string;
        signature: string;
      }) => Promise<WorthResult>;
    };
  }
}

interface BreakdownItem {
  group: string;
  label: string;
  value: string | number;
  worth: number;
}

interface SubscriptionInfo {
  planType: number;
  startedAt: number;
  isActive: boolean;
  label: string;
  boostPercent: number;
}

interface WorthResult {
  totalWorth?: number;
  worthBoostPercent?: number;
  subscription?: SubscriptionInfo;
  breakdown?: BreakdownItem[];
}

interface WorthPreview {
  totalWorth?: number;
  worthBoostPercent?: number;
  subscription?: SubscriptionInfo;
  breakdown: BreakdownItem[];
}

export function WorthInfo() {
  const { address, isConnected } = useAccount();
  const { activeChain } = useChain();
  const { authData, isSigning, signError, requestSignature } = useAuth();

  const [worthData, setWorthData] = useState<WorthPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Profile: true,
    Assets: true,
  });

  const fetchWorth = useCallback(async () => {
    if (!address || !authData || !window.MafiaWorth) {
      setError("MafiaWorth not available. Please ensure the page is fully loaded.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.MafiaWorth.computeWorth({
        chain: activeChain,
        player: address,
        signMsg: authData.message,
        signature: authData.signature,
      });

      const breakdown = Array.isArray(result?.breakdown) ? result.breakdown : [];
      const preview: WorthPreview = {
        totalWorth: result?.totalWorth,
        worthBoostPercent: result?.worthBoostPercent,
        subscription: result?.subscription,
        breakdown,
      };

      setWorthData(preview);
    } catch (err) {
      console.error("[v0] Worth computation error:", err);
      setError(err instanceof Error ? err.message : "Failed to compute worth");
    } finally {
      setIsLoading(false);
    }
  }, [address, authData, activeChain]);

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // Group breakdown items by their group property
  const groupedBreakdown = worthData?.breakdown.reduce(
    (acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, BreakdownItem[]>
  );

  const formatValue = (value: string | number): string => {
    if (typeof value === "number") {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return value;
  };

  const formatWorth = (worth: number): string => {
    return worth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <DollarSign className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">Player Worth</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your wallet to view your worth.
        </p>
      </div>
    );
  }

  if (isSigning) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-semibold text-foreground">Sign to Verify</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign the message in your wallet to load your worth.
        </p>
      </div>
    );
  }

  if (signError) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
        <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
        <p className="text-lg font-semibold text-foreground">
          Signature Required
        </p>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          A wallet signature is needed to verify your identity.
        </p>
        <button
          onClick={requestSignature}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign Message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Player Worth</h3>
            <p className="text-xs text-muted-foreground font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
        <button
          onClick={fetchWorth}
          disabled={isLoading || !authData}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {worthData ? "Refresh" : "Calculate Worth"}
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-500/10 p-4 text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!worthData && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground">
              Calculate Your Worth
            </p>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-md">
              Click the button above to compute your total player worth based on
              your profile, assets, and achievements.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
            <p className="text-lg font-semibold text-foreground">
              Computing Worth...
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              This may take a moment.
            </p>
          </div>
        )}

        {worthData && !isLoading && (
          <div className="space-y-6">
            {/* Total Worth Card */}
            <div className="rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total Worth
                  </p>
                  <p className="mt-1 text-4xl font-bold text-foreground">
                    {formatWorth(worthData.totalWorth ?? 0)}
                  </p>
                </div>
                {worthData.worthBoostPercent !== undefined && worthData.worthBoostPercent > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1.5 text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      +{worthData.worthBoostPercent.toFixed(1)}% boost
                    </span>
                  </div>
                )}
              </div>

              {/* Subscription Badge */}
              {worthData.subscription?.isActive && (
                <div className="mt-4 flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-foreground">
                    {worthData.subscription.label} Subscriber
                  </span>
                  {worthData.subscription.boostPercent > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({worthData.subscription.boostPercent}% worth boost)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Breakdown by Group */}
            {groupedBreakdown && Object.entries(groupedBreakdown).map(([group, items]) => {
              const isExpanded = expandedGroups[group] ?? true;
              const groupTotal = items.reduce((sum, item) => sum + item.worth, 0);
              const GroupIcon = group === "Profile" ? User : Briefcase;

              return (
                <div key={group} className="rounded-lg border border-border overflow-hidden">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="flex w-full items-center justify-between bg-background/50 p-4 hover:bg-background/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <GroupIcon className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-foreground">{group}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary">
                        {formatWorth(groupTotal)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="divide-y divide-border">
                      {items.map((item, idx) => (
                        <div
                          key={`${item.label}-${idx}`}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {formatValue(item.value)}
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            <p className={`text-sm font-medium ${item.worth > 0 ? "text-green-400" : "text-muted-foreground"}`}>
                              {formatWorth(item.worth)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
