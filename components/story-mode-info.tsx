"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Trophy, Gift, Clock } from "lucide-react";

export function StoryModeInfo() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            About Story Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            Complete story missions across 7 chapters to earn rewards and prove
            yourself as a true Made Man.
          </p>
          <p>
            Each chapter contains 5 tasks. Complete all tasks in a chapter to
            claim your reward before moving to the next.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
              Cash
            </Badge>
            <span className="text-sm text-muted-foreground">
              Earn in-game cash
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              Items
            </Badge>
            <span className="text-sm text-muted-foreground">
              Weapons, keys, perk boxes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
              Credits
            </Badge>
            <span className="text-sm text-muted-foreground">
              Helper & GI credits
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
              Premium
            </Badge>
            <span className="text-sm text-muted-foreground">
              Unlimited subscription
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" />
            Final Reward
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Complete all 7 chapters to unlock the exclusive Mystery Box reward.
          </p>
          <p className="text-amber-400">
            Claim it before someone else does!
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ol className="list-decimal list-inside space-y-1">
            <li>Complete tasks in order within each chapter</li>
            <li>Tasks auto-track when you perform actions in-game</li>
            <li>Claim chapter reward when all tasks are done</li>
            <li>Move to the next chapter automatically</li>
            <li>Finish all chapters to claim Mystery Box</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
