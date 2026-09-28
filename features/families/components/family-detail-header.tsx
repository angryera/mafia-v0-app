"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Family } from "@/features/families/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, RefreshCw, Skull, Users } from "lucide-react";
import Link from "next/link";

interface FamilyDetailHeaderProps {
  family: Family;
  isConnected: boolean;
  isMyFamily: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function FamilyDetailHeader({
  family,
  isConnected,
  isMyFamily,
  isRefreshing,
  onRefresh,
}: FamilyDetailHeaderProps) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/families">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <Users className="h-6 w-6 text-primary" />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{family.name}</h1>
          {family.isDead ? (
            <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400">
              <Skull className="mr-1 h-3 w-3" />
              Disbanded
            </Badge>
          ) : (
            <Badge variant="outline" className="border-green-500/50 bg-green-500/10 text-green-400">
              Active
            </Badge>
          )}
          {isConnected &&
            (isMyFamily ? (
              <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary">
                My family
              </Badge>
            ) : (
              <Badge variant="outline" className="border-border bg-secondary text-muted-foreground">
                Not your family
              </Badge>
            ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Family ID: #{family.familyId} | {family.memberCount} members
        </p>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="ml-auto"
        title="Refresh"
      >
        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      </Button>
    </div>
  );
}
