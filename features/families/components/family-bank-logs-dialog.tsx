"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFamilyBankLogs } from "@/features/families/hooks/use-family-bank-logs";
import {
  BANK_LOG_TYPES,
  bankLogIsNative,
  bankLogRankLabel,
  bankLogTypeBadgeClass,
  bankLogTypeLabel,
  formatCashAmount,
  formatLogTimestamp,
  formatNativeAmount,
  type BankLogEntry,
} from "@/features/families/lib/family-bank";
import { formatWalletAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { zeroAddress } from "viem";

interface FamilyBankLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: number;
  nativeSymbol: string;
  rosterNameByAddr: Readonly<Record<string, string>>;
}

export function FamilyBankLogsDialog({ open, onOpenChange, ...contentProps }: FamilyBankLogsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Family bank log</DialogTitle>
          <DialogDescription>
            Cash & native treasury activity — deposits, withdrawals, taxes, promotions, swaps, and
            seeding. Newest entries first.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so each opening starts at the newest page. */}
        <FamilyBankLogsContent {...contentProps} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FamilyBankLogsContent({
  familyId,
  nativeSymbol,
  rosterNameByAddr,
  onClose,
}: Omit<FamilyBankLogsDialogProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  const logs = useFamilyBankLogs(familyId, rosterNameByAddr);

  return (
    <>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{logs.pageLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          disabled={logs.isLoading}
          onClick={logs.refresh}
          title="Refresh"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", logs.isLoading && "animate-spin")} />
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <ScrollArea className="h-[min(60vh,440px)] w-full rounded-md border border-border/60">
          <div className="pr-3">
            {logs.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : logs.logs.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No log entries yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase">Type</TableHead>
                    <TableHead className="text-[10px] uppercase">Player</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Amount</TableHead>
                    <TableHead className="text-right text-[10px] uppercase">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.logs.map((log, index) => (
                    <BankLogRow
                      key={`${log.timestamp}-${log.user}-${index}`}
                      log={log}
                      nameByAddr={logs.nameByAddr}
                      nativeSymbol={nativeSymbol}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </ScrollArea>
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={!logs.hasNewer || logs.isLoading}
            onClick={logs.showNewer}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Newer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={!logs.hasOlder || logs.isLoading}
            onClick={logs.showOlder}
          >
            Older
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </>
  );
}

function BankLogRow({
  log,
  nameByAddr,
  nativeSymbol,
}: {
  log: BankLogEntry;
  nameByAddr: Readonly<Record<string, string>>;
  nativeSymbol: string;
}) {
  const userName = nameByAddr[log.user.toLowerCase()] ?? null;
  const recipientKey = log.recipient?.toLowerCase();
  const hasRecipient = !!recipientKey && recipientKey !== zeroAddress.toLowerCase();
  const recipientName = hasRecipient ? (nameByAddr[recipientKey] ?? null) : null;

  const isNative = bankLogIsNative(log.logType);
  const isSwap = log.logType === BANK_LOG_TYPES.NativeSwap;
  const isNativeWithdraw = log.logType === BANK_LOG_TYPES.NativeWithdraw;
  const isSeed = log.logType === BANK_LOG_TYPES.Seed;
  const rankLabel =
    log.logType === BANK_LOG_TYPES.Promotion ? bankLogRankLabel(log.rank) : null;

  return (
    <TableRow className="border-border/30">
      <TableCell className="py-2 align-top">
        <Badge variant="outline" className={cn("text-[10px]", bankLogTypeBadgeClass(log.logType))}>
          {bankLogTypeLabel(log.logType)}
          {rankLabel ? ` · ${rankLabel}` : ""}
          {log.logSubType ? ` · ${log.logSubType}` : ""}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[10rem] py-2 align-top text-xs">
        <div className="flex gap-0.5">
          {isSeed ? (
            <span className="font-medium text-foreground">Protocol</span>
          ) : userName ? (
            <span className="font-medium text-foreground">{userName}</span>
          ) : (
            <span className="font-mono text-muted-foreground">{formatWalletAddress(log.user)}</span>
          )}
          {isNativeWithdraw && recipientKey && (
            <span className="font-medium text-muted-foreground">
              → {recipientName ?? formatWalletAddress(log.recipient)}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2 text-right align-top">
        <div className="flex flex-col items-end gap-0.5 font-mono text-xs tabular-nums">
          <span className="text-foreground">
            {isNative ? formatNativeAmount(log.amount) : formatCashAmount(log.amount)}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              {isNative ? nativeSymbol : "cash"}
            </span>
          </span>
          {isSwap && log.secondaryAmount > BigInt(0) && (
            <span className="text-[10px] text-emerald-400">
              +{formatCashAmount(log.secondaryAmount)}{" "}
              <span className="text-muted-foreground">cash</span>
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap py-2 text-right align-top text-[10px] text-muted-foreground">
        {formatLogTimestamp(log.timestamp)}
      </TableCell>
    </TableRow>
  );
}
