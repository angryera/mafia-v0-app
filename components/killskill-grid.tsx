"use client";

import { Swords } from "lucide-react";
import { TRAIN_TYPES } from "@/lib/contract";
import { KillSkillCard } from "@/components/killskill-card";

export function KillSkillGrid() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Swords className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Training Options
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Call{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-primary">
              trainSkill(trainType)
            </code>{" "}
            to level up
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {TRAIN_TYPES.map((t) => (
          <KillSkillCard key={t.id} trainType={t} />
        ))}
      </div>
    </div>
  );
}
