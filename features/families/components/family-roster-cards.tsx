"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CopyAddressButton,
  MemberStatusBadge,
  RoleIcon,
  StatusIndicators,
  getRoleBadgeClass,
} from "@/features/families/components/family-roster-parts";
import type { FamilyMember } from "@/features/families/types";
import { cn } from "@/lib/utils";
import { Crown, Shield, User, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function FamilyStats({
  leaderCount,
  memberCount,
  leaveFee,
}: {
  leaderCount: number;
  memberCount: number;
  leaveFee: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon={Crown} iconClassName="bg-yellow-500/10 text-yellow-500" label="Leadership">
        {leaderCount} leaders
      </StatCard>
      <StatCard icon={Users} iconClassName="bg-primary/10 text-primary" label="Members">
        {memberCount} soldiers
      </StatCard>
      <StatCard icon={Shield} iconClassName="bg-amber-500/10 text-amber-500" label="Leave Fee">
        <span className="font-mono">
          {leaveFee > 0 ? `${(leaveFee / 1e18).toLocaleString()} MAFIA` : "Free"}
        </span>
      </StatCard>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconClassName,
  label,
  children,
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconClassName)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold">{children}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RosterCard({
  icon: Icon,
  iconClassName,
  title,
  children,
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className={cn("h-4 w-4", iconClassName)} />
          {title}
        </CardTitle>
      </CardHeader>
      <Table>{children}</Table>
    </Card>
  );
}

export function FamilySuccessorCard({ successor }: { successor: FamilyMember }) {
  return (
    <RosterCard icon={Shield} iconClassName="text-amber-500" title="Successor">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Role</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-center">Level</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Address</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>
            <div className="flex items-center gap-2">
              <RoleIcon role="Heir" />
              <Badge variant="outline" className={cn("text-[10px]", getRoleBadgeClass("Heir"))}>
                Heir
              </Badge>
            </div>
          </TableCell>
          <TableCell className="font-medium">
            {successor.name || "Unknown"}
            <StatusIndicators isJailed={successor.isJailed} isDead={successor.isDead} />
          </TableCell>
          <TableCell className="text-center font-mono text-sm">{successor.level}</TableCell>
          <TableCell>
            <MemberStatusBadge isJailed={successor.isJailed} isDead={successor.isDead} />
          </TableCell>
          <TableCell>
            <CopyAddressButton address={successor.address} />
          </TableCell>
        </TableRow>
      </TableBody>
    </RosterCard>
  );
}

export function FamilyMembersCard({ members }: { members: FamilyMember[] }) {
  return (
    <RosterCard icon={User} iconClassName="text-primary" title={`Members (${members.length})`}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Name</TableHead>
          <TableHead className="text-center">Level</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Address</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.address}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {member.name || "Unknown"}
                <StatusIndicators isJailed={member.isJailed} isDead={member.isDead} />
              </div>
            </TableCell>
            <TableCell className="text-center font-mono text-sm">{member.level}</TableCell>
            <TableCell>
              <MemberStatusBadge isJailed={member.isJailed} isDead={member.isDead} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{member.country || "—"}</TableCell>
            <TableCell>
              <CopyAddressButton address={member.address} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </RosterCard>
  );
}
