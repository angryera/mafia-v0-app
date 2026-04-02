"use client";

import { useAccount } from "wagmi";
import { useChainAddresses, useChainExplorer } from "@/components/chain-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyableAddress } from "@/components/copyable-address";
import { Calendar, Target, Gift, Clock } from "lucide-react";

export function WeeklyMissionInfo() {
  const { isConnected } = useAccount();
  const addresses = useChainAddresses();
  const explorer = useChainExplorer();

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          Weekly Mission Contract
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div>
          <p className="text-muted-foreground mb-1.5">Contract Address</p>
          <CopyableAddress
            address={addresses.weeklyMission}
            explorerUrl={explorer}
          />
        </div>

        <div className="space-y-2.5 pt-2 border-t border-border">
          <div className="flex items-start gap-2">
            <Calendar className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">7-Day Cycle</p>
              <p className="text-muted-foreground">
                Complete all missions within 7 days to claim rewards
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Target className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Mission Types</p>
              <p className="text-muted-foreground">
                Common missions + Smuggle missions (buy/sell booze & narcs)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Gift className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Rewards</p>
              <p className="text-muted-foreground">
                Max reward decays 18% per day - claim early for maximum payout
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Expiration</p>
              <p className="text-muted-foreground">
                Missions expire after 7 days - generate new ones to continue
              </p>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="pt-2 border-t border-border">
            <p className="text-muted-foreground italic">
              Connect your wallet to view your weekly missions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
