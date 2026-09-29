"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { SectionCard } from "@/features/fts/components/fts-ui";
import { chartFractionDigits, formatChartDate, formatChartUsd, type PricePoint } from "@/features/fts/lib/fts";

const chartConfig = {
  value: { label: "USD", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

export function ShareValueChart({
  points,
  loading,
  deployed,
}: {
  points: PricePoint[];
  loading: boolean;
  deployed: boolean;
}) {
  const digits = chartFractionDigits(points.map((point) => point.value));
  const latest = points.length > 0 ? points[points.length - 1].value : null;

  return (
    <SectionCard title="Share value chart">
      {latest != null ? (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground">Latest daily price</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{formatChartUsd(latest, digits)}</p>
        </div>
      ) : null}
      {points.length > 0 ? (
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => formatChartDate(Number(value))}
              minTickGap={28}
            />
            <YAxis width={84} tickFormatter={(value) => formatChartUsd(Number(value), digits)} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => {
                    const timestamp = payload?.[0]?.payload?.timestamp;
                    return typeof timestamp === "number" ? formatChartDate(timestamp) : "";
                  }}
                  formatter={(value) => (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {formatChartUsd(Number(value), digits)}
                    </span>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              fill="var(--color-value)"
              fillOpacity={0.18}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ChartContainer>
      ) : deployed ? (
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading price history…" : "No completed auction price history yet."}
        </p>
      ) : null}
    </SectionCard>
  );
}
