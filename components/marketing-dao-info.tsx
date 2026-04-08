"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote, Clock, Users, CheckCircle, XCircle, Loader2, PauseCircle, DollarSign } from "lucide-react";

export function MarketingDaoInfo() {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Vote className="h-4 w-4 text-primary" />
          Marketing DAO
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Vote on marketing proposals using MAFIA tokens. Stake your tokens to support options and help decide how marketing funds are spent.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-blue-500" />
            <div>
              <p className="font-medium text-foreground">In Progress</p>
              <p className="text-xs">Voting is active, countdown timer shows time remaining</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Loader2 className="mt-0.5 h-4 w-4 text-yellow-500" />
            <div>
              <p className="font-medium text-foreground">Finished</p>
              <p className="text-xs">Voting ended, awaiting admin to close</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
            <div>
              <p className="font-medium text-foreground">Completed</p>
              <p className="text-xs">Proposal closed, winner selected</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 text-red-500" />
            <div>
              <p className="font-medium text-foreground">Canceled</p>
              <p className="text-xs">Proposal was canceled by admin</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <PauseCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Pending</p>
              <p className="text-xs">Proposal created but not yet opened</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border/50">
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 text-primary/70" />
            <div>
              <p className="font-medium text-foreground">Voting Power</p>
              <p className="text-xs">Vote weight equals MAFIA tokens staked</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <DollarSign className="mt-0.5 h-4 w-4 text-primary/70" />
            <div>
              <p className="font-medium text-foreground">Withdraw</p>
              <p className="text-xs">Reclaim tokens after proposal closes or cancels</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/50 bg-secondary/30 p-3">
          <p className="text-xs leading-relaxed">
            Approve MAFIA token spending before voting. Your tokens are locked until the proposal completes, then can be withdrawn.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
