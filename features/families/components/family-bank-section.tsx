"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FamilyBankLogsDialog } from "@/features/families/components/family-bank-logs-dialog";
import {
  FamilyCashDepositDialog,
  FamilyCashWithdrawDialog,
} from "@/features/families/components/family-cash-dialogs";
import {
  FamilyNativeSwapDialog,
  FamilyNativeWithdrawDialog,
} from "@/features/families/components/family-native-dialogs";
import { FamilyPromotionRewardsDialog } from "@/features/families/components/family-promotion-rewards-dialog";
import type { FamilyBankDialogProps } from "@/features/families/components/family-bank-dialog-types";
import { useFamilyBank } from "@/features/families/hooks/use-family-bank";
import type { FamilyMembership } from "@/features/families/hooks/use-family-membership";
import { formatCashAmount, formatNativeAmount } from "@/features/families/lib/family-bank";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Coins,
  Gift,
  Landmark,
  ScrollText,
  Send,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

type BankDialog =
  | "deposit"
  | "withdraw"
  | "withdrawNative"
  | "swapNative"
  | "promotionRewards"
  | "logs";

interface FamilyBankSectionProps {
  familyId: number;
  membership: FamilyMembership;
  nativeSymbol: string;
  rosterNameByAddr: Readonly<Record<string, string>>;
  /** Called after any confirmed bank transaction. */
  onBankChanged: () => void;
}

export function FamilyBankSection({
  familyId,
  membership,
  nativeSymbol,
  rosterNameByAddr,
  onBankChanged,
}: FamilyBankSectionProps) {
  const bank = useFamilyBank(familyId);
  const [openDialog, setOpenDialog] = useState<BankDialog | null>(null);

  if (!bank.bankConfigured) return null;

  const { isConnected, isFamilyMember, canWithdrawFromBank } = membership;
  const nativeEmpty = bank.nativeBalanceWei === undefined || bank.nativeBalanceWei === BigInt(0);

  /** Closing only clears `dialog`, so a late tx confirmation can't close another dialog. */
  const setDialogOpen = (dialog: BankDialog, open: boolean) =>
    setOpenDialog((current) => (open ? dialog : current === dialog ? null : current));

  const dialogProps = (dialog: BankDialog, onCompleted: () => void): FamilyBankDialogProps => ({
    open: openDialog === dialog,
    onOpenChange: (open) => setDialogOpen(dialog, open),
    familyId,
    bank,
    membership,
    nativeSymbol,
    onCompleted,
  });

  const handleBalancesChanged = () => {
    void bank.refetchBalances();
    onBankChanged();
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TreasuryCard
          icon={Landmark}
          iconClassName="bg-primary/10 text-primary"
          label="Family cash treasury"
          amount={formatCashAmount(bank.balanceWei)}
          unit="cash"
        >
          <ActionButton icon={Gift} onClick={() => setOpenDialog("promotionRewards")}>
            Rewards
          </ActionButton>
          <ActionButton icon={ScrollText} onClick={() => setOpenDialog("logs")}>
            Log
          </ActionButton>
          {isConnected ? (
            <>
              <ActionButton icon={ArrowDownToLine} onClick={() => setOpenDialog("deposit")}>
                Deposit
              </ActionButton>
              <ActionButton icon={ArrowUpFromLine} onClick={() => setOpenDialog("withdraw")}>
                Withdraw
              </ActionButton>
            </>
          ) : (
            <Hint>Connect wallet to deposit or withdraw</Hint>
          )}
        </TreasuryCard>

        <TreasuryCard
          icon={Coins}
          iconClassName="bg-amber-500/10 text-amber-500"
          label="Family native treasury"
          amount={formatNativeAmount(bank.nativeBalanceWei)}
          unit={nativeSymbol}
        >
          {!isConnected ? (
            <Hint>Connect wallet to interact with native treasury</Hint>
          ) : (
            <>
              {isFamilyMember && (
                <ActionButton
                  icon={ArrowLeftRight}
                  onClick={() => setOpenDialog("swapNative")}
                  disabled={nativeEmpty}
                >
                  Swap to Cash
                </ActionButton>
              )}
              {canWithdrawFromBank && (
                <ActionButton icon={Send} onClick={() => setOpenDialog("withdrawNative")}>
                  Withdraw Native
                </ActionButton>
              )}
              {!isFamilyMember && !canWithdrawFromBank && (
                <Hint>Members can swap; top leaders can withdraw native.</Hint>
              )}
            </>
          )}
        </TreasuryCard>
      </div>

      <FamilyCashDepositDialog {...dialogProps("deposit", handleBalancesChanged)} />
      <FamilyCashWithdrawDialog {...dialogProps("withdraw", handleBalancesChanged)} />
      <FamilyNativeWithdrawDialog {...dialogProps("withdrawNative", handleBalancesChanged)} />
      <FamilyNativeSwapDialog {...dialogProps("swapNative", handleBalancesChanged)} />
      <FamilyPromotionRewardsDialog
        {...dialogProps("promotionRewards", () => void bank.refetchRewards())}
      />
      <FamilyBankLogsDialog
        open={openDialog === "logs"}
        onOpenChange={(open) => setDialogOpen("logs", open)}
        familyId={familyId}
        nativeSymbol={nativeSymbol}
        rosterNameByAddr={rosterNameByAddr}
      />
    </>
  );
}

function TreasuryCard({
  icon: Icon,
  iconClassName,
  label,
  amount,
  unit,
  children,
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  amount: string;
  unit: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClassName}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
              {amount}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">{children}</div>
      </CardContent>
    </Card>
  );
}

function ActionButton({
  icon: Icon,
  onClick,
  disabled,
  children,
}: {
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button size="sm" variant="outline" className="gap-1.5" onClick={onClick} disabled={disabled}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Button>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="self-center text-xs text-muted-foreground">{children}</p>;
}
