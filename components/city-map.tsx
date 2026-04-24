"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Loader2, MapPin } from "lucide-react";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";
import { useChain } from "@/components/chain-provider";
import {
  CityMapMySlotsPanel,
  type MySlotRow,
} from "@/components/city-map-my-slots";
import { slotHasOwner, type ParsedSlotInfo } from "@/lib/city-map-types";
import { getSlotBuildingLabel } from "@/lib/city-slot-config";
import { CityMapSlotDetail } from "@/components/city-map-slot-detail";
import { CityMapLandClaim } from "@/components/city-map-land-claim";
import { City } from "@/lib/contract";

export type { ParsedSlotInfo };

type CellType =
  | "empty"
  | "user"
  | "family-hq"
  | "protocol"
  | "business"
  | "raid";

interface CellData {
  x: number;
  y: number;
  type: CellType;
  owner?: string;
  name?: string;
  slot?: ParsedSlotInfo;
}

const GRID_COLS = 50;
const GRID_ROWS = 30;
const CELL_SIZE = 18;
const CELL_GAP = 1;
const CELL_STEP = CELL_SIZE + CELL_GAP;

const GRID_W = GRID_COLS * CELL_STEP - CELL_GAP;
const GRID_H = GRID_ROWS * CELL_STEP - CELL_GAP;

/** Ignore tile click after pointer moved this far (pan / span). */
const PAN_CLICK_SUPPRESS_PX = 6;

// ────────────────────────────────────────────────────────────────
// Color & label config per type
// ────────────────────────────────────────────────────────────────
const TYPE_META: Record<
  CellType,
  { fill: string; fillHover: string; label: string; dot: string }
> = {
  empty: {
    fill: "hsl(220 14% 10%)",
    fillHover: "hsl(220 14% 14%)",
    label: "Empty",
    dot: "bg-[hsl(220_14%_10%)]",
  },
  user: {
    fill: "hsl(172 66% 40%)",
    fillHover: "hsl(172 66% 50%)",
    label: "User slot",
    dot: "bg-[hsl(172_66%_40%)]",
  },
  "family-hq": {
    fill: "hsl(265 60% 50%)",
    fillHover: "hsl(265 60% 60%)",
    label: "Family HQ",
    dot: "bg-[hsl(265_60%_50%)]",
  },
  protocol: {
    fill: "hsl(43 96% 56%)",
    fillHover: "hsl(43 96% 66%)",
    label: "Protocol",
    dot: "bg-[hsl(43_96%_56%)]",
  },
  business: {
    fill: "hsl(210 70% 45%)",
    fillHover: "hsl(210 70% 55%)",
    label: "Business",
    dot: "bg-[hsl(210_70%_45%)]",
  },
  raid: {
    fill: "hsl(12 76% 48%)",
    fillHover: "hsl(12 76% 58%)",
    label: "Raid spot",
    dot: "bg-[hsl(12_76%_48%)]",
  },
};

const SLOT_TYPE_LABELS: Record<number, string> = {
  1: "User slot",
  2: "Protocol",
  3: "Business",
  4: "Family HQ",
  5: "Raid spot",
};

const LEGEND_ORDER: CellType[] = [
  "empty",
  "user",
  "business",
  "protocol",
  "family-hq",
  "raid",
];

function slotTypeToCellType(slotType: number): CellType {
  switch (slotType) {
    case 1:
      return "user";
    case 2:
      return "protocol";
    case 3:
      return "business";
    case 4:
      return "family-hq";
    case 5:
      return "raid";
    default:
      return "empty";
  }
}

function shortAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function generateEmptyGrid(): CellData[] {
  const cells: CellData[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      cells.push({ x, y, type: "empty" });
    }
  }
  return cells;
}

function applySlotsToGrid(
  base: CellData[],
  slots: ParsedSlotInfo[]
): CellData[] {
  const next = base.map((c) => ({ ...c }));
  for (const slot of slots) {
    if (
      slot.x < 0 ||
      slot.x >= GRID_COLS ||
      slot.y < 0 ||
      slot.y >= GRID_ROWS
    ) {
      continue;
    }
    const idx = slot.y * GRID_COLS + slot.x;
    const cellType = slotTypeToCellType(slot.slotType);
    if (cellType === "empty") continue;

    const owned = slotHasOwner(slot);
    // User-slot tiles with no on-chain owner are vacant plots — same look as empty grid.
    const displayType =
      cellType === "user" && !owned ? "empty" : cellType;

    const building = getSlotBuildingLabel(slot);
    const label =
      building ||
      SLOT_TYPE_LABELS[slot.slotType] ||
      `Type ${slot.slotType}`;

    next[idx] = {
      x: slot.x,
      y: slot.y,
      type: displayType,
      name: displayType === "empty" && cellType === "user" ? undefined : label,
      owner: owned ? shortAddress(slot.owner) : undefined,
      slot,
    };
  }
  return next;
}

function useMafiaMapScript() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window.MafiaMapApi || window.MafiaMap)) {
      setReady(true);
      return;
    }
    const existing = document.querySelector('script[src="/js/mafia-utils.js"]');
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "/js/mafia-utils.js";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => console.warn("Mafia utils script failed to load");
    document.head.appendChild(script);
  }, []);

  return ready;
}

// ────────────────────────────────────────────────────────────────
// Canvas grid
// ────────────────────────────────────────────────────────────────
type MapFocusSlot = { cityId: number; x: number; y: number };

function isMySlot(
  slot: ParsedSlotInfo | undefined,
  address: string | undefined
): boolean {
  if (!address || !slot || !slotHasOwner(slot)) return false;
  return slot.owner.toLowerCase() === address.toLowerCase();
}

export function CityMap() {
  const { chainConfig } = useChain();
  const { address } = useAccount();
  const mapScriptReady = useMafiaMapScript();

  const [mySlotsOpen, setMySlotsOpen] = useState(false);
  const [mapFocusSlot, setMapFocusSlot] = useState<MapFocusSlot | null>(null);

  const requestFocusSlot = useCallback(
    (cid: number, x: number, y: number) => {
      setMapFocusSlot({ cityId: cid, x, y });
    },
    []
  );

  const clearFocusSlot = useCallback(() => setMapFocusSlot(null), []);

  const emptyTemplate = useMemo(() => generateEmptyGrid(), []);

  const [cells, setCells] = useState<CellData[]>(() => generateEmptyGrid());
  const [cityId, setCityId] = useState(1);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const reloadSlots = useCallback(async () => {
    const mapApi = window.MafiaMapApi ?? window.MafiaMap;
    if (!mapScriptReady || !mapApi?.getSlots) {
      setSlotsLoading(false);
      setCells(emptyTemplate);
      return;
    }
    setSlotsLoading(true);
    setSlotsError(null);
    try {
      const slots = await mapApi.getSlots({
        chain: chainConfig.id,
        cityId,
      });
      setCells(applySlotsToGrid(emptyTemplate, slots));
    } catch (e) {
      console.error("[CityMap] getSlots failed:", e);
      setSlotsError("Could not load map slots");
      setCells(emptyTemplate);
    } finally {
      setSlotsLoading(false);
    }
  }, [mapScriptReady, chainConfig.id, cityId, emptyTemplate]);

  useEffect(() => {
    const mapApi = window.MafiaMapApi ?? window.MafiaMap;
    if (!mapScriptReady || !mapApi?.getSlots) {
      setSlotsLoading(false);
      setCells(emptyTemplate);
      return;
    }
    void reloadSlots();
  }, [mapScriptReady, chainConfig.id, cityId, emptyTemplate, reloadSlots]);

  // Transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [translateStart, setTranslateStart] = useState({ x: 0, y: 0 });

  // Tile detail overlay
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);

  // Hover state
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(scale);
  const translateRef = useRef(translate);
  scaleRef.current = scale;
  translateRef.current = translate;
  /** True when the current pointer sequence moved enough to count as a pan (suppress click). */
  const panGestureRef = useRef(false);

  // Center grid on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const initScale = Math.min(
      (rect.width - 32) / GRID_W,
      (rect.height - 32) / GRID_H,
      1.5
    );
    setScale(initScale);
    setTranslate({
      x: (rect.width - GRID_W * initScale) / 2,
      y: (rect.height - GRID_H * initScale) / 2,
    });
  }, []);

  useEffect(() => {
    if (!mapFocusSlot) return;
    if (cityId !== mapFocusSlot.cityId) {
      setCityId(mapFocusSlot.cityId);
    }
  }, [mapFocusSlot, cityId]);

  useEffect(() => {
    if (!mapFocusSlot || !containerRef.current) return;
    if (cityId !== mapFocusSlot.cityId) return;
    if (slotsLoading) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const cx = (mapFocusSlot.x + 0.5) * CELL_STEP;
    const cy = (mapFocusSlot.y + 0.5) * CELL_STEP;
    const s = scaleRef.current;
    setTranslate({
      x: rect.width / 2 - cx * s,
      y: rect.height / 2 - cy * s,
    });
    clearFocusSlot();
  }, [mapFocusSlot, cityId, slotsLoading, clearFocusSlot]);

  // Draw canvas
  const draw = useCallback(
    (hovered: number | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = GRID_W;
      const h = GRID_H;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const meta = TYPE_META[cell.type];
        ctx.fillStyle = i === hovered ? meta.fillHover : meta.fill;
        ctx.fillRect(
          cell.x * CELL_STEP,
          cell.y * CELL_STEP,
          CELL_SIZE,
          CELL_SIZE
        );
        if (isMySlot(cell.slot, address)) {
          ctx.strokeStyle = "rgba(250, 204, 21, 0.95)";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            cell.x * CELL_STEP + 0.5,
            cell.y * CELL_STEP + 0.5,
            CELL_SIZE - 1,
            CELL_SIZE - 1
          );
        }
      }
    },
    [cells, address]
  );

  // Redraw on hover change
  useEffect(() => {
    draw(hoveredIdx);
  }, [draw, hoveredIdx]);

  /** Wheel zoom must use a non-passive listener so the page does not scroll (React onWheel is passive). */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const s = scaleRef.current;
      const t = translateRef.current;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = Math.min(Math.max(s * factor, 0.3), 5);
      setTranslate({
        x: mx - (mx - t.x) * (newScale / s),
        y: my - (my - t.y) * (newScale / s),
      });
      setScale(newScale);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    if (!selectedCell) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedCell]);

  // ── Pan handlers ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      panGestureRef.current = false;
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setTranslateStart(translate);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [translate]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Hover detection
      if (containerRef.current && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / scale;
        const cy = (e.clientY - rect.top) / scale;
        const gx = Math.floor(cx / CELL_STEP);
        const gy = Math.floor(cy / CELL_STEP);
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
          setHoveredIdx(gy * GRID_COLS + gx);
        } else {
          setHoveredIdx(null);
        }
      }

      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (
        dx * dx + dy * dy >=
        PAN_CLICK_SUPPRESS_PX * PAN_CLICK_SUPPRESS_PX
      ) {
        panGestureRef.current = true;
      }
      setTranslate({
        x: translateStart.x + (e.clientX - dragStart.x),
        y: translateStart.y + (e.clientY - dragStart.y),
      });
    },
    [isDragging, dragStart, translateStart, scale]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ── Click handler ──
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (panGestureRef.current) {
        panGestureRef.current = false;
        return;
      }
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = (e.clientX - rect.left) / scale;
      const cy = (e.clientY - rect.top) / scale;
      const gx = Math.floor(cx / CELL_STEP);
      const gy = Math.floor(cy / CELL_STEP);

      if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) {
        setSelectedCell(null);
        return;
      }

      const cell = cells[gy * GRID_COLS + gx];
      if (!cell) return;

      setSelectedCell(cell);
    },
    [cells, scale]
  );

  // ── Zoom controls ──
  const zoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = Math.min(scale * 1.3, 5);
    setTranslate({
      x: cx - (cx - translate.x) * (newScale / scale),
      y: cy - (cy - translate.y) * (newScale / scale),
    });
    setScale(newScale);
  }, [scale, translate]);

  const zoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newScale = Math.max(scale / 1.3, 0.3);
    setTranslate({
      x: cx - (cx - translate.x) * (newScale / scale),
      y: cy - (cy - translate.y) * (newScale / scale),
    });
    setScale(newScale);
  }, [scale, translate]);

  const resetView = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const initScale = Math.min(
      (rect.width - 32) / GRID_W,
      (rect.height - 32) / GRID_H,
      1.5
    );
    setScale(initScale);
    setTranslate({
      x: (rect.width - GRID_W * initScale) / 2,
      y: (rect.height - GRID_H * initScale) / 2,
    });
    setSelectedCell(null);
  }, []);

  const counts = useMemo(() => {
    const c: Record<CellType, number> = {
      empty: 0,
      user: 0,
      "family-hq": 0,
      protocol: 0,
      business: 0,
      raid: 0,
    };
    for (const cell of cells) c[cell.type]++;
    return c;
  }, [cells]);

  const occupiedCount = useMemo(
    () => cells.filter((c) => c.slot && slotHasOwner(c.slot)).length,
    [cells]
  );

  /** User slot type with no on-chain owner — land can be claimed into these plots. */
  const vacantUserPlotCount = useMemo(
    () =>
      cells.filter(
        (c) => c.slot?.slotType === 1 && !slotHasOwner(c.slot)
      ).length,
    [cells]
  );

  const mySlotsRows = useMemo((): MySlotRow[] => {
    if (!address) return [];
    const out: MySlotRow[] = [];
    for (const c of cells) {
      if (!c.slot || !isMySlot(c.slot, address)) continue;
      out.push({ cityId, x: c.x, y: c.y, slot: c.slot });
    }
    out.sort((a, b) => a.y - b.y || a.x - b.x);
    return out;
  }, [cells, address, cityId]);

  const cityLabel = City[cityId] ?? `City #${cityId}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>City</span>
          <select
            value={cityId}
            onChange={(e) => setCityId(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
          >
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={i}>
                {City[i] ?? `City #${i}`} ({i})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setMySlotsOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          <MapPin className="h-3.5 w-3.5" />
          My slots
        </button>
        <CityMapLandClaim
          cityId={cityId}
          vacantUserPlotCount={vacantUserPlotCount}
          onSuccess={() => void reloadSlots()}
        />
        <span className="text-xs text-muted-foreground">
          Chain:{" "}
          <span className="font-mono text-foreground">{chainConfig.id}</span>
        </span>
        {slotsError && (
          <span className="text-xs text-amber-500">{slotsError}</span>
        )}
      </div>

      {/* Map viewport */}
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-card",
          "h-[calc(100vh-220px)] min-h-[400px]",
          "overscroll-contain touch-manipulation",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
      >
        {/* Transformed canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            imageRendering: "pixelated",
          }}
        />

        {/* Legend overlay */}
        <div className="pointer-events-none absolute left-3 bottom-3 rounded-lg border border-border bg-card/90 px-3 py-2.5 backdrop-blur-sm">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Legend
          </p>
          <div className="flex flex-col gap-1">
            {LEGEND_ORDER.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 rounded-sm", TYPE_META[t].dot)}
                />
                <span className="text-[11px] text-foreground">
                  {TYPE_META[t].label}
                </span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {counts[t]}
                </span>
              </div>
            ))}
            {address && (
              <div className="mt-1.5 flex items-center gap-2 border-t border-border/60 pt-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm border-2 border-amber-400 bg-transparent"
                  aria-hidden
                />
                <span className="text-[11px] text-foreground">Your slots</span>
              </div>
            )}
          </div>
        </div>

        {slotsLoading && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card/95 px-4 py-2.5 text-sm text-foreground shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading slots…
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomIn();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/90 text-foreground backdrop-blur-sm transition-colors hover:bg-secondary"
            aria-label="Zoom in"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="7" y1="2" x2="7" y2="12" />
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomOut();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/90 text-foreground backdrop-blur-sm transition-colors hover:bg-secondary"
            aria-label="Zoom out"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetView();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/90 text-xs font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-secondary"
            aria-label="Reset view"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 7a5 5 0 0 1 9.5-1.5M12 7a5 5 0 0 1-9.5 1.5" />
              <path d="M12 2v4h-4M2 12V8h4" />
            </svg>
          </button>
        </div>

        {/* Coordinates display */}
        {hoveredIdx !== null && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-border bg-card/90 px-2.5 py-1 backdrop-blur-sm">
            <span className="font-mono text-xs text-foreground">
              ({cells[hoveredIdx].x}, {cells[hoveredIdx].y})
            </span>
            {(cells[hoveredIdx].type !== "empty" ||
              (cells[hoveredIdx].slot?.slotType === 1 &&
                !slotHasOwner(cells[hoveredIdx].slot))) && (
              <span className="ml-2 text-xs text-muted-foreground">
                {cells[hoveredIdx].slot?.slotType === 1 &&
                !slotHasOwner(cells[hoveredIdx].slot)
                  ? "Vacant user plot"
                  : TYPE_META[cells[hoveredIdx].type].label}
              </span>
            )}
          </div>
        )}

      </div>

      <CityMapMySlotsPanel
        open={mySlotsOpen}
        onClose={() => setMySlotsOpen(false)}
        requestFocusSlot={requestFocusSlot}
        cityLabel={cityLabel}
        rows={mySlotsRows}
        slotsLoading={slotsLoading}
        slotsError={slotsError}
        onRefresh={() => void reloadSlots()}
      />

      {selectedCell && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            aria-hidden
            onClick={() => setSelectedCell(null)}
            onWheel={(e) => e.preventDefault()}
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto w-full max-w-md max-h-[90vh] flex flex-col min-h-0"
              onClick={(ev) => ev.stopPropagation()}
            >
              <CityMapSlotDetail
                cell={selectedCell}
                cityId={cityId}
                typeMeta={{
                  fill: TYPE_META[selectedCell.type].fill,
                  label: TYPE_META[selectedCell.type].label,
                }}
                onClose={() => setSelectedCell(null)}
                onActionSuccess={() => void reloadSlots()}
              />
            </div>
          </div>
        </>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
        <span className="text-xs text-muted-foreground">
          Grid size:{" "}
          <span className="font-mono text-foreground">
            {GRID_COLS} x {GRID_ROWS}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          Total plots:{" "}
          <span className="font-mono text-foreground">
            {GRID_COLS * GRID_ROWS}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          Occupied:{" "}
          <span className="font-mono text-foreground">{occupiedCount}</span>
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Scroll to zoom, drag to pan, click for details
        </span>
      </div>
    </div>
  );
}
