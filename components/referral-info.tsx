"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UserPlus, Trophy, Gift, Users } from "lucide-react";

export function ReferralInfo() {
  return (
    <div className="space-y-4">
      {/* Overview */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Invite new players to the game using your wallet address as their referrer.
            Track your referrals and compete on the leaderboard!
          </p>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="referrals">
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  My Referrals
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>View all players who used your address as their referrer</li>
                  <li>Search by name, address, or country</li>
                  <li>Track your referral count in real-time</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="leaderboard">
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Leaderboard
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>See top referrers ranked by referral count</li>
                  <li>Check your position on the leaderboard</li>
                  <li>Compete for the top spots</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="invite">
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-green-500" />
                  Inviting Players
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <ul className="list-disc list-inside space-y-1">
                  <li>Share your wallet address with new players</li>
                  <li>New players enter your address during registration</li>
                  <li>Your referral count increases automatically</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Leaderboard Ranks */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Leaderboard Ranks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex h-8 w-8 items-center justify-center">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-yellow-500">#1 Gold</p>
              <p className="text-xs text-muted-foreground">Top referrer</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-400/10 border border-gray-400/30">
            <div className="flex h-8 w-8 items-center justify-center">
              <Trophy className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-400">#2 Silver</p>
              <p className="text-xs text-muted-foreground">Second place</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-amber-600/10 border border-amber-600/30">
            <div className="flex h-8 w-8 items-center justify-center">
              <Trophy className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-600">#3 Bronze</p>
              <p className="text-xs text-muted-foreground">Third place</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              1
            </Badge>
            <p>Share your referral address on social media</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              2
            </Badge>
            <p>Help new players get started in the game</p>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline" className="text-xs shrink-0">
              3
            </Badge>
            <p>Build a community of active players</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
