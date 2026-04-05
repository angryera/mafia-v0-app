"use client";

import { Loader2, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMapLandClaim } from "@/hooks/use-map-land-claim";

export function CityMapLandClaim({
  cityId,
  vacantUserPlotCount,
  onSuccess,
}: {
  cityId: number;
  vacantUserPlotCount: number;
  onSuccess?: () => void;
}) {
  const { handleClaimLand, phase, busy, claimButtonDisabled, vrfPending } =
    useMapLandClaim({
      cityId,
      hasVacantUserPlots: vacantUserPlotCount > 0,
      onSuccess,
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        disabled={claimButtonDisabled}
        onClick={handleClaimLand}
      >
        {busy ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            {phase === "approving" && "Approve OG Crate…"}
            {phase === "requesting" && "Requesting claim…"}
            {phase === "finishing" && "Finishing claim…"}
          </>
        ) : (
          <>
            <CircleDot className="mr-1.5 h-3.5 w-3.5" />
            Claim land
          </>
        )}
      </Button>
      {vrfPending && !busy && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Waiting for VRF (OG Crate)…
        </span>
      )}
      <span className="text-[11px] text-muted-foreground">
        Vacant plots:{" "}
        <span className="font-mono text-foreground">{vacantUserPlotCount}</span>
      </span>
    </div>
  );
}
