"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FamilyBankDialogProps } from "@/features/families/components/family-bank-dialog-types";
import {
  TransactionDialogFooter,
  TransactionErrorText,
} from "@/features/families/components/family-dialog-parts";
import {
  formatCashAmount,
  formatWeiForInput,
  parseCashInput,
  promotionRankLabel,
  promotionRewardInputsFromWei,
} from "@/features/families/lib/family-bank";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { FAMILY_GAME_CASH_BANK } from "@/lib/contract";
import { Gift } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type FamilyPromotionRewardsDialogProps = Omit<FamilyBankDialogProps, "nativeSymbol">;

/**
 * Row `rank` reads and edits index `rank - 1` of both the wei list and the
 * input map; saving sends input key `rank` for contract rank `rank`.
 */
export function FamilyPromotionRewardsDialog({
  open,
  onOpenChange,
  familyId,
  bank,
  membership,
  onCompleted,
}: FamilyPromotionRewardsDialogProps) {
  const { promotionRewardsWei, promotionRewardRankIds, promotionRewardsLoaded } = bank;
  const canEdit = membership.canSetPromotionRewards;
  const [inputs, setInputs] = useState<Record<number, string>>({});
  const inputsSyncedRef = useRef(false);

  const saveRewards = useContractTransaction({
    onSuccess: () => {
      toast.success("Promotion rewards updated");
      onOpenChange(false);
      onCompleted();
    },
  });

  useEffect(() => {
    if (!open) {
      inputsSyncedRef.current = false;
      return;
    }
    if (!promotionRewardsLoaded || inputsSyncedRef.current) return;
    inputsSyncedRef.current = true;
    setInputs(promotionRewardInputsFromWei(promotionRewardsWei, promotionRewardRankIds));
  }, [open, promotionRewardsLoaded, promotionRewardsWei, promotionRewardRankIds]);

  const handleSave = () => {
    if (!bank.bankConfigured || !membership.isConnected) return;
    if (!canEdit) {
      toast.error("Only the Don can set promotion rewards");
      return;
    }

    const ranks: number[] = [];
    const amounts: bigint[] = [];
    for (const rank of promotionRewardRankIds) {
      const raw = (inputs[rank] ?? "").trim();
      const wei = raw ? parseCashInput(raw) : BigInt(0);
      if (wei === null) {
        toast.error(`Enter a valid amount for ${promotionRankLabel(rank)}`);
        return;
      }
      ranks.push(rank);
      amounts.push(wei);
    }

    saveRewards.reset();
    saveRewards.write({
      address: bank.bankAddress,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "setPromotionRewards",
      args: [BigInt(familyId), ranks, amounts],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Promotion rank rewards</DialogTitle>
          <DialogDescription>
            Cash paid from the family bank when a member is promoted to a player rank (Apprentice
            through Godfather).
            {canEdit
              ? " As Don, you can set the reward for each rank."
              : " Only the Don can change these amounts."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-[min(70vh,480px)] w-full rounded-md border border-border/60">
            <div className="pr-3">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase">Rank</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">
                      {canEdit ? "Reward (cash)" : "Reward"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotionRewardRankIds.map((rank) => {
                    const currentWei = promotionRewardsWei[rank - 1] ?? BigInt(0);
                    return (
                      <TableRow key={rank} className="border-border/30">
                        <TableCell className="py-2">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                              #{rank}
                            </span>
                            <span className="text-sm font-medium">{promotionRankLabel(rank)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          {canEdit ? (
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={inputs[rank - 1] ?? formatWeiForInput(currentWei)}
                              onChange={(e) =>
                                setInputs((prev) => ({ ...prev, [rank - 1]: e.target.value }))
                              }
                              disabled={saveRewards.isLoading || rank === 1}
                              className="ml-auto max-w-[9rem] text-right font-mono text-sm"
                            />
                          ) : (
                            <span className="font-mono text-sm tabular-nums">
                              {formatCashAmount(currentWei)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        <TransactionErrorText error={saveRewards.error} />
        <TransactionDialogFooter
          onCancel={() => onOpenChange(false)}
          cancelLabel="Close"
          isLoading={saveRewards.isLoading}
          confirm={
            canEdit ? { label: "Save rewards", icon: Gift, onClick: handleSave } : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}
