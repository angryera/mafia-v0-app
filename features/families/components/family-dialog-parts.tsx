"use client";

import { getErrorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function TransactionErrorText({ error }: { error: Error | null | undefined }) {
  if (!error) return null;
  return <p className="text-xs text-red-400">{getErrorMessage(error)}</p>;
}

export function PermissionNotice({ children }: { children: ReactNode }) {
  return <p className="text-sm text-amber-400">{children}</p>;
}

interface AmountFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  numeric?: boolean;
}

export function AmountField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder = "0",
  numeric = true,
}: AmountFieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground" htmlFor={id}>
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode={numeric ? "decimal" : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="font-mono"
      />
    </div>
  );
}

interface TransactionDialogFooterProps {
  onCancel: () => void;
  cancelLabel?: string;
  isLoading: boolean;
  /** Omit to render only the cancel button. */
  confirm?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
  };
}

export function TransactionDialogFooter({
  onCancel,
  cancelLabel = "Cancel",
  isLoading,
  confirm,
}: TransactionDialogFooterProps) {
  const ConfirmIcon = isLoading ? Loader2 : confirm?.icon;
  return (
    <DialogFooter className="gap-2 sm:gap-0">
      <Button variant="outline" onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </Button>
      {confirm && ConfirmIcon && (
        <Button
          onClick={confirm.onClick}
          disabled={isLoading || confirm.disabled}
          className="gap-1.5"
        >
          <ConfirmIcon className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {confirm.label}
        </Button>
      )}
    </DialogFooter>
  );
}
