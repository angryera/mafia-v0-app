"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Shield,
  Globe,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";

export function CreateProfileInfo() {
  return (
    <div className="space-y-4">
      {/* Requirements Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />
            Profile Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Profile Name</p>
              <p className="text-xs text-muted-foreground">
                Letters only, maximum 14 characters. First letter will be capitalized automatically.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Gender</p>
              <p className="text-xs text-muted-foreground">
                Choose your character&apos;s gender. This affects your avatar appearance.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Globe className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Country</p>
              <p className="text-xs text-muted-foreground">
                Select your country. This is displayed on your public profile.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name Rules Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Name Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              <span className="text-muted-foreground">Only letters (A-Z, a-z)</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              <span className="text-muted-foreground">Maximum 14 characters</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
              <span className="text-muted-foreground">Auto-formatted (Michael, Sarah)</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
              <span className="text-muted-foreground">No numbers or special characters</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
              <span className="text-muted-foreground">Names must be unique</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Referral Info Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If someone invited you to the game, enter their wallet address as your referral. 
            Both you and your referrer may receive rewards. This field is optional.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
