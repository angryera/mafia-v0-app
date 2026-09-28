"use client";

import { useChain } from "@/components/chain-provider";
import { FamilyShareStake } from "@/components/family-share-stake";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FamilyBankSection } from "@/features/families/components/family-bank-section";
import { FamilyDetailHeader } from "@/features/families/components/family-detail-header";
import { FamilyLeadershipSection } from "@/features/families/components/family-leadership-section";
import {
  FamilyMembersCard,
  FamilyStats,
  FamilySuccessorCard,
} from "@/features/families/components/family-roster-cards";
import { useFamilyMembership } from "@/features/families/hooks/use-family-membership";
import { useFamilyRoster } from "@/features/families/hooks/use-family-roster";
import { nativeSymbolForChain } from "@/features/families/lib/family-bank";
import {
  buildRosterNameMap,
  getDonAddress,
  getMemberOptions,
  getRegularMembers,
  getSortedLeaderSlots,
  hasSuccessor,
} from "@/features/families/lib/family-roster";
import { ArrowLeft, RefreshCw, Skull } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface FamilyDetailProps {
  familyId: number;
}

export function FamilyDetail({ familyId }: FamilyDetailProps) {
  const { chainConfig } = useChain();
  const roster = useFamilyRoster(familyId);
  const { family } = roster;
  const { refetchPlayerInfo, ...membership } = useFamilyMembership(family, familyId);

  const derived = useMemo(
    () =>
      family && {
        leaderSlots: getSortedLeaderSlots(family),
        regularMembers: getRegularMembers(family),
        memberOptions: getMemberOptions(family),
        rosterNameByAddr: buildRosterNameMap(family),
        donAddress: getDonAddress(family),
      },
    [family],
  );

  if (!family || !derived) {
    if (roster.error) {
      return <FamilyLoadError message={roster.error} onRetry={roster.refetch} />;
    }
    return <FamilyDetailSkeleton progress={roster.loadProgress} />;
  }

  return (
    <div className="space-y-6">
      <FamilyDetailHeader
        family={family}
        isConnected={membership.isConnected}
        isMyFamily={membership.isMyFamily}
        isRefreshing={roster.isLoading}
        onRefresh={roster.refetch}
      />

      {roster.error && <p className="text-sm text-red-400">{roster.error}</p>}

      <FamilyBankSection
        familyId={familyId}
        membership={membership}
        nativeSymbol={nativeSymbolForChain(chainConfig.id)}
        rosterNameByAddr={derived.rosterNameByAddr}
        onBankChanged={() => void refetchPlayerInfo()}
      />

      <FamilyShareStake familyId={familyId} isFamilyMember={membership.isFamilyMember} />

      <FamilyStats
        leaderCount={derived.leaderSlots.length}
        memberCount={derived.regularMembers.length}
        leaveFee={family.leaveFee}
      />

      <FamilyLeadershipSection
        familyId={familyId}
        slots={derived.leaderSlots}
        myLeaderRole={membership.myLeaderRole}
        isConnected={membership.isConnected}
        canManage={membership.canManageFamilyLeaders}
        memberOptions={derived.memberOptions}
        donAddress={derived.donAddress}
        onLeaderUpdated={() => void roster.refetch()}
      />

      {hasSuccessor(family) && <FamilySuccessorCard successor={family.successor} />}

      {derived.regularMembers.length > 0 && (
        <FamilyMembersCard members={derived.regularMembers} />
      )}
    </div>
  );
}

function FamilyDetailSkeleton({ progress }: { progress: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        {progress && <p className="ml-auto text-xs text-muted-foreground">{progress}</p>}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}

function FamilyLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-red-500/50 bg-red-500/10">
      <CardContent className="p-6 text-center">
        <Skull className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h3 className="text-lg font-semibold text-red-400">{message}</h3>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/families">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Families
            </Link>
          </Button>
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
