"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FamilyBankDialogProps } from "@/features/families/components/family-bank-dialog-types";
import {
  AmountField,
  PermissionNotice,
  TransactionDialogFooter,
  TransactionErrorText,
} from "@/features/families/components/family-dialog-parts";
import { formatNativeAmount, parseCashInput } from "@/features/families/lib/family-bank";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { FAMILY_GAME_CASH_BANK } from "@/lib/contract";
import { ArrowLeftRight, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { isAddress } from "viem";

function NativeTreasuryBalance({ wei, symbol }: { wei: bigint | undefined; symbol: string }) {
  return (
    <span className="font-mono text-foreground">
      {formatNativeAmount(wei)} {symbol}
    </span>
  );
}

export function FamilyNativeWithdrawDialog({
  open,
  onOpenChange,
  familyId,
  bank,
  membership,
  nativeSymbol,
  onCompleted,
}: FamilyBankDialogProps) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const withdrawNative = useContractTransaction({
    onSuccess: () => {
      toast.success("Native withdrawal successful");
      setAmount("");
      setRecipient("");
      onOpenChange(false);
      onCompleted();
    },
  });

  const handleWithdraw = () => {
    if (!bank.bankConfigured || !membership.isConnected) return;
    if (!membership.canWithdrawFromBank) {
      toast.error("Only Don, Consigliere, or Capodecina can withdraw");
      return;
    }
    const to = recipient.trim();
    if (!isAddress(to)) {
      toast.error("Enter a valid recipient address");
      return;
    }
    const wei = parseCashInput(amount);
    if (wei === null) {
      toast.error("Enter a valid amount");
      return;
    }
    if (bank.nativeBalanceWei !== undefined && wei > bank.nativeBalanceWei) {
      toast.error("Amount exceeds native treasury balance");
      return;
    }
    withdrawNative.reset();
    withdrawNative.write({
      address: bank.bankAddress,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "withdrawNative",
      args: [BigInt(familyId), to, wei],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw native from family</DialogTitle>
          <DialogDescription>
            Send native {nativeSymbol} from the family treasury to a chosen recipient. Treasury
            balance: <NativeTreasuryBalance wei={bank.nativeBalanceWei} symbol={nativeSymbol} />
          </DialogDescription>
        </DialogHeader>
        {membership.canWithdrawFromBank ? (
          <div className="space-y-3">
            <AmountField
              id="withdraw-native-recipient"
              label="Recipient address"
              placeholder="0x…"
              numeric={false}
              value={recipient}
              onChange={setRecipient}
              disabled={withdrawNative.isLoading}
            />
            <AmountField
              id="withdraw-native-amount"
              label={`Amount (${nativeSymbol})`}
              value={amount}
              onChange={setAmount}
              disabled={withdrawNative.isLoading}
            />
          </div>
        ) : (
          <PermissionNotice>Only Don, Consigliere, or Capodecina can withdraw native.</PermissionNotice>
        )}
        <TransactionErrorText error={withdrawNative.error} />
        <TransactionDialogFooter
          onCancel={() => onOpenChange(false)}
          isLoading={withdrawNative.isLoading}
          confirm={{
            label: "Confirm withdraw",
            icon: Send,
            onClick: handleWithdraw,
            disabled: !membership.canWithdrawFromBank,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function FamilyNativeSwapDialog({
  open,
  onOpenChange,
  familyId,
  bank,
  membership,
  nativeSymbol,
  onCompleted,
}: FamilyBankDialogProps) {
  const [amount, setAmount] = useState("");

  const swapNative = useContractTransaction({
    onSuccess: () => {
      toast.success("Swapped native to cash");
      setAmount("");
      onOpenChange(false);
      onCompleted();
    },
  });

  const handleSwap = () => {
    if (!bank.bankConfigured || !membership.isConnected) return;
    if (!membership.isFamilyMember) {
      toast.error("Only members of this family can swap");
      return;
    }
    const wei = parseCashInput(amount);
    if (wei === null) {
      toast.error("Enter a valid amount");
      return;
    }
    if (bank.nativeBalanceWei !== undefined && wei > bank.nativeBalanceWei) {
      toast.error("Amount exceeds native treasury balance");
      return;
    }
    swapNative.reset();
    swapNative.write({
      address: bank.bankAddress,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "swapNativeToCash",
      args: [BigInt(familyId), wei],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Swap native to cash</DialogTitle>
          <DialogDescription>
            Convert family-owned {nativeSymbol} from the native treasury into in-game cash via the
            on-chain swap. Treasury balance:{" "}
            <NativeTreasuryBalance wei={bank.nativeBalanceWei} symbol={nativeSymbol} />
          </DialogDescription>
        </DialogHeader>
        {membership.isFamilyMember ? (
          <AmountField
            id="swap-native-amount"
            label={`Amount (${nativeSymbol})`}
            value={amount}
            onChange={setAmount}
            disabled={swapNative.isLoading}
          />
        ) : (
          <PermissionNotice>Only family members can swap the native treasury.</PermissionNotice>
        )}
        <TransactionErrorText error={swapNative.error} />
        <TransactionDialogFooter
          onCancel={() => onOpenChange(false)}
          isLoading={swapNative.isLoading}
          confirm={{
            label: "Confirm swap",
            icon: ArrowLeftRight,
            onClick: handleSwap,
            disabled: !membership.isFamilyMember,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
