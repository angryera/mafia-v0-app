import type { FamilyBankState } from "@/features/families/hooks/use-family-bank";
import type { FamilyMembership } from "@/features/families/hooks/use-family-membership";

export interface FamilyBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: number;
  bank: FamilyBankState;
  membership: FamilyMembership;
  nativeSymbol: string;
  /** Called after a bank transaction is confirmed. */
  onCompleted: () => void;
}
