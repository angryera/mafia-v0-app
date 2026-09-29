import { formatEther } from "viem";
import { OC_LOBBY_STATUS } from "@/lib/constants/const";
import { parseOcRewardAmount } from "@/lib/constants/helper";

export interface CrimeLobbyMember {
  user: string;
  itemIds: number[];
  impactScore: number;
  deductedScore: number;
  assetAddresses: string[];
  assetAmounts: number[];
}

export interface CrimeLobbyReward {
  typeId: number;
  amount: number;
}

export interface CrimeLobby {
  id: number;
  leader: string;
  members: CrimeLobbyMember[];
  isSuccess: boolean;
  city: number;
  failureType: number;
  assetExpectation: number;
  minRank: number;
  impactScore: number;
  deductedScore: number;
  status: number;
  createdAt: number;
  startBlock: number;
  isRewardClaimed: boolean;
  currentRewardIndex: number;
  rewards: CrimeLobbyReward[];
}

export function parseCrimeLobby(data: unknown): CrimeLobby {
  const d = data as Record<string, unknown>;
  return {
    id: Number(d.id),
    leader: d.leader as string,
    members: ((d.members as unknown[]) || []).map((m: unknown) => {
      const member = m as Record<string, unknown>;
      return {
        user: member.user as string,
        itemIds: ((member.itemIds as unknown[]) || []).map((id) => Number(id)),
        impactScore: Number(member.impactScore),
        deductedScore: Number(member.deductedScore),
        assetAddresses: (member.assetAddresses as string[]) || [],
        assetAmounts: ((member.assetAmounts as unknown[]) || []).map((amt) =>
          Number(formatEther(amt as bigint))
        ),
      };
    }),
    isSuccess: Boolean(d.isSuccess),
    city: Number(d.city),
    failureType: Number(d.failureType),
    assetExpectation: Number(d.assetExpectation),
    minRank: Number(d.minRank),
    impactScore: Number(d.impactScore),
    deductedScore: Number(d.deductedScore),
    status: Number(d.status),
    createdAt: Number(d.createdAt),
    startBlock: Number(d.startBlock),
    isRewardClaimed: Boolean(d.isRewardClaimed),
    currentRewardIndex: Number(d.currentRewardIndex),
    rewards: ((d.rewards as unknown[]) || []).map((r: unknown) => {
      const reward = r as Record<string, unknown>;
      const typeId = Number(reward.typeId);
      return {
        typeId,
        amount: parseOcRewardAmount(typeId, reward.amount as bigint),
      };
    }),
  };
}

/** Badge classes for an `OC_LOBBY_STATUS` value. */
export function getLobbyStatusColor(status: number): string {
  switch (status) {
    case OC_LOBBY_STATUS.WAITING:
      return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    case OC_LOBBY_STATUS.STARTED:
      return "bg-blue-500/10 text-blue-500 border-blue-500/30";
    case OC_LOBBY_STATUS.FINISHED:
      return "bg-green-500/10 text-green-500 border-green-500/30";
    case OC_LOBBY_STATUS.CANCELLED:
      return "bg-red-500/10 text-red-500 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground";
  }
}
