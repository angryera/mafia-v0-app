"use client";

import { useChainAddresses } from "@/components/chain-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TransactionDialogFooter,
  TransactionErrorText,
} from "@/features/families/components/family-dialog-parts";
import { RosterCard } from "@/features/families/components/family-roster-cards";
import {
  CopyAddressButton,
  MemberStatusBadge,
  RoleIcon,
  StatusIndicators,
  getRoleBadgeClass,
} from "@/features/families/components/family-roster-parts";
import {
  canManageLeaderSlot,
  isLeaderAssigned,
  type LeaderSlot,
} from "@/features/families/lib/family-leadership";
import type { FamilyMemberOption } from "@/features/families/lib/family-roster";
import { useContractTransaction } from "@/hooks/use-contract-transaction";
import { MAFIA_FAMILY_ABI } from "@/lib/constants/abi";
import { cn } from "@/lib/utils";
import { Crown, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DON_LEADER_INDEX = 0;

interface FamilyLeadershipSectionProps {
  familyId: number;
  slots: LeaderSlot[];
  myLeaderRole: string | null;
  isConnected: boolean;
  canManage: boolean;
  memberOptions: FamilyMemberOption[];
  donAddress: string | null;
  onLeaderUpdated: () => void;
}

export function FamilyLeadershipSection({
  familyId,
  slots,
  myLeaderRole,
  isConnected,
  canManage,
  memberOptions,
  donAddress,
  onLeaderUpdated,
}: FamilyLeadershipSectionProps) {
  const { mafiaFamily } = useChainAddresses();
  const [managedSlot, setManagedSlot] = useState<LeaderSlot | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");

  const updateLeader = useContractTransaction({
    onSuccess: () => {
      toast.success("Family leader updated");
      setDialogOpen(false);
      setManagedSlot(null);
      setSelectedMember("");
      onLeaderUpdated();
    },
  });

  const isDonSlot = managedSlot?.leaderIndex === DON_LEADER_INDEX;

  /** The Don may only be placed in the Don slot. */
  const assignableMembers = useMemo(() => {
    if (!canManage) return [];
    if (!managedSlot || isDonSlot || !donAddress) return memberOptions;
    return memberOptions.filter((m) => m.address.toLowerCase() !== donAddress);
  }, [canManage, managedSlot, isDonSlot, donAddress, memberOptions]);

  const openManageDialog = (slot: LeaderSlot) => {
    const current = isLeaderAssigned(slot) ? slot.address : "";
    const currentIsDonElsewhere =
      slot.leaderIndex !== DON_LEADER_INDEX && !!donAddress && current.toLowerCase() === donAddress;
    setManagedSlot(slot);
    setSelectedMember(currentIsDonElsewhere ? "" : current);
    updateLeader.reset();
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!isConnected) {
      toast.error("Connect your wallet");
      return;
    }
    if (!managedSlot) return;
    if (!canManageLeaderSlot(myLeaderRole, managedSlot.leaderIndex)) {
      toast.error("You cannot manage this leadership slot");
      return;
    }
    if (!selectedMember) {
      toast.error("Select a family member");
      return;
    }
    updateLeader.reset();
    updateLeader.write({
      address: mafiaFamily,
      abi: MAFIA_FAMILY_ABI,
      functionName: "updateFamilyLeader",
      args: [BigInt(familyId), selectedMember as `0x${string}`, managedSlot.leaderIndex],
    });
  };

  return (
    <>
      {slots.length > 0 && (
        <RosterCard icon={Crown} iconClassName="text-yellow-500" title="Leadership">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Role</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-center">Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Address</TableHead>
              {canManage && <TableHead className="text-right">Manage</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {slots.map((slot) => (
              <LeaderRow
                key={`${slot.displayRole}-${slot.leaderIndex}`}
                slot={slot}
                showManage={canManage}
                manageable={canManageLeaderSlot(myLeaderRole, slot.leaderIndex)}
                onManage={() => openManageDialog(slot)}
              />
            ))}
          </TableBody>
        </RosterCard>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign {managedSlot?.displayRole}</DialogTitle>
            <DialogDescription>
              {isDonSlot
                ? "Choose any family member for the Don position."
                : "Choose a family member. The Don cannot be assigned to other leadership roles."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="leader-member-select">Family member</Label>
            {assignableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No eligible family members found.</p>
            ) : (
              <Select
                value={selectedMember || undefined}
                onValueChange={setSelectedMember}
                disabled={updateLeader.isLoading}
              >
                <SelectTrigger id="leader-member-select">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {assignableMembers.map((m) => (
                    <SelectItem key={m.address} value={m.address}>
                      {m.name} · Lvl {m.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <TransactionErrorText error={updateLeader.error} />
          <TransactionDialogFooter
            onCancel={() => setDialogOpen(false)}
            isLoading={updateLeader.isLoading}
            confirm={{
              label: "Confirm",
              icon: UserCog,
              onClick: handleConfirm,
              disabled: !selectedMember,
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function LeaderRow({
  slot,
  showManage,
  manageable,
  onManage,
}: {
  slot: LeaderSlot;
  showManage: boolean;
  manageable: boolean;
  onManage: () => void;
}) {
  const assigned = isLeaderAssigned(slot);
  return (
    <TableRow
      className={cn(
        !assigned && "bg-muted/20 text-muted-foreground opacity-60 hover:bg-muted/20",
      )}
    >
      <TableCell>
        <div className={cn("flex items-center gap-2", !assigned && "opacity-70")}>
          <RoleIcon role={slot.role} />
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              assigned
                ? getRoleBadgeClass(slot.role)
                : "border-border/50 bg-muted/30 text-muted-foreground",
            )}
          >
            {slot.displayRole}
          </Badge>
        </div>
      </TableCell>
      <TableCell className={cn("font-medium", !assigned && "italic text-muted-foreground")}>
        {assigned ? slot.name : "Not Assigned"}
        {assigned && <StatusIndicators isJailed={slot.isJailed} isDead={slot.isDead} />}
      </TableCell>
      <TableCell className="text-center font-mono text-sm">
        {assigned ? slot.level : "—"}
      </TableCell>
      <TableCell>
        {assigned ? (
          <MemberStatusBadge isJailed={slot.isJailed} isDead={slot.isDead} />
        ) : (
          <Badge
            variant="outline"
            className="border-border/50 bg-muted/30 text-[10px] text-muted-foreground"
          >
            Vacant
          </Badge>
        )}
      </TableCell>
      <TableCell>
        {assigned ? (
          <CopyAddressButton address={slot.address} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      {showManage && (
        <TableCell className="text-right">
          {manageable ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs"
              onClick={onManage}
            >
              <UserCog className="h-3 w-3" />
              {assigned ? "Change" : "Assign"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
