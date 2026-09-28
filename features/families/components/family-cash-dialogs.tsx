"use client";

import { useChainAddresses } from "@/components/chain-provider";
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
import { formatCashAmount, parseCashInput } from "@/features/families/lib/family-bank";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import {
  FAMILY_GAME_CASH_BANK,
  INGAME_CURRENCY_ABI,
  INGAME_CURRENCY_APPROVE_AMOUNT,
} from "@/lib/contract";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function FamilyCashDepositDialog({
  open,
  onOpenChange,
  familyId,
  bank,
  membership,
  onCompleted,
}: FamilyBankDialogProps) {
  const { ingameCurrency } = useChainAddresses();
  const [amount, setAmount] = useState("");
  const pendingDepositRef = useRef<bigint | null>(null);

  const deposit = useContractTransaction({
    onSuccess: () => {
      toast.success("Deposit successful");
      setAmount("");
      onOpenChange(false);
      onCompleted();
    },
  });

  const writeDeposit = (wei: bigint) =>
    deposit.write({
      address: bank.bankAddress,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "deposit",
      args: [BigInt(familyId), wei],
    });

  const approve = useContractTransaction({
    onSuccess: () => {
      const wei = pendingDepositRef.current;
      if (wei === null) return;
      pendingDepositRef.current = null;
      deposit.reset();
      writeDeposit(wei);
    },
  });

  useEffect(() => {
    if (approve.error) pendingDepositRef.current = null;
  }, [approve.error]);

  const isLoading = deposit.isLoading || approve.isLoading;

  const handleDeposit = () => {
    if (!bank.bankConfigured || !membership.isConnected) return;
    if (!membership.isFamilyMember) {
      toast.error("Only members of this family can deposit");
      return;
    }
    const wei = parseCashInput(amount);
    if (wei === null) {
      toast.error("Enter a valid cash amount");
      return;
    }
    if (bank.allowance === undefined) {
      toast.error("Allowance not loaded yet");
      return;
    }
    if (bank.myCashBalanceWei !== undefined && wei > bank.myCashBalanceWei) {
      toast.error("Insufficient in-game cash");
      return;
    }
    approve.reset();
    deposit.reset();
    if (bank.allowance < wei) {
      pendingDepositRef.current = wei;
      approve.write({
        address: ingameCurrency,
        abi: INGAME_CURRENCY_ABI,
        functionName: "approveInGameCurrency",
        args: [bank.bankAddress, INGAME_CURRENCY_APPROVE_AMOUNT],
      });
      return;
    }
    writeDeposit(wei);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit to family bank</DialogTitle>
          <DialogDescription>
            Transfer in-game cash from your wallet into the family treasury.
            {membership.isFamilyMember && (
              <>
                {" "}
                Your balance:{" "}
                <span className="font-mono text-foreground">
                  {formatCashAmount(bank.myCashBalanceWei)} cash
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        {membership.isFamilyMember ? (
          <AmountField
            id="deposit-amount"
            label="Amount (cash)"
            value={amount}
            onChange={setAmount}
            disabled={isLoading}
          />
        ) : (
          <PermissionNotice>You must be a member of this family to deposit.</PermissionNotice>
        )}
        <TransactionErrorText error={deposit.error ?? approve.error} />
        <TransactionDialogFooter
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          confirm={{
            label: "Confirm deposit",
            icon: ArrowDownToLine,
            onClick: handleDeposit,
            disabled: !membership.isFamilyMember,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function withdrawDeniedReason({ isFamilyMember, myLeaderRole }: FamilyBankDialogProps["membership"]) {
  if (!isFamilyMember) {
    return "You must be a member of this family with a leadership role to withdraw.";
  }
  return myLeaderRole
    ? `${myLeaderRole} cannot withdraw from the bank.`
    : "Leadership role required to withdraw.";
}

export function FamilyCashWithdrawDialog({
  open,
  onOpenChange,
  familyId,
  bank,
  membership,
  onCompleted,
}: FamilyBankDialogProps) {
  const [amount, setAmount] = useState("");

  const withdraw = useContractTransaction({
    onSuccess: () => {
      toast.success("Withdrawal successful");
      setAmount("");
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
    const wei = parseCashInput(amount);
    if (wei === null) {
      toast.error("Enter a valid cash amount");
      return;
    }
    if (bank.balanceWei !== undefined && wei > bank.balanceWei) {
      toast.error("Amount exceeds family bank balance");
      return;
    }
    withdraw.reset();
    withdraw.write({
      address: bank.bankAddress,
      abi: FAMILY_GAME_CASH_BANK,
      functionName: "withdraw",
      args: [BigInt(familyId), wei],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw from family bank</DialogTitle>
          <DialogDescription>
            Only Don, Consigliere, and Capodecina can withdraw. Treasury balance:{" "}
            <span className="font-mono text-foreground">
              {formatCashAmount(bank.balanceWei)} cash
            </span>
          </DialogDescription>
        </DialogHeader>
        {membership.canWithdrawFromBank ? (
          <AmountField
            id="withdraw-amount"
            label="Amount (cash)"
            value={amount}
            onChange={setAmount}
            disabled={withdraw.isLoading}
          />
        ) : (
          <PermissionNotice>{withdrawDeniedReason(membership)}</PermissionNotice>
        )}
        <TransactionErrorText error={withdraw.error} />
        <TransactionDialogFooter
          onCancel={() => onOpenChange(false)}
          isLoading={withdraw.isLoading}
          confirm={{
            label: "Confirm withdraw",
            icon: ArrowUpFromLine,
            onClick: handleWithdraw,
            disabled: !membership.canWithdrawFromBank,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
