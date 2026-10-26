import { Crosshair, DollarSign, Flag, Heart, Lock, Medal, Swords } from "lucide-react";

import type { RewardKey } from "@/lib/profile-unbox";

const ICONS = {
  rank: Medal,
  killSkill: Swords,
  bustOutSkill: Lock,
  raceSkill: Flag,
  cash: DollarSign,
  bullets: Crosshair,
  health: Heart,
} as const;

export function RewardGlyph({ rewardKey }: { rewardKey: RewardKey }) {
  const Icon = ICONS[rewardKey];
  return <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}
