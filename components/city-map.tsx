"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
type CellType = "empty" | "user" | "family-hq" | "protocol";

interface CellData {
  x: number;
  y: number;
  type: CellType;
  owner?: string;
  name?: string;
}

const GRID_COLS = 50;
const GRID_ROWS = 30;
const CELL_SIZE = 18;
const CELL_GAP = 1;
const CELL_STEP = CELL_SIZE + CELL_GAP;

const GRID_W = GRID_COLS * CELL_STEP - CELL_GAP;
const GRID_H = GRID_ROWS * CELL_STEP - CELL_GAP;

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
    label: "User Owned",
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
    label: "Protocol Owned",
    dot: "bg-[hsl(43_96%_56%)]",
  },
};

// ────────────────────────────────────────────────────────────────
// Deterministic mock data seeded by coords
// ────────────────────────────────────────────────────────────────
function pseudoRandom(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h >>> 0) / 4294967296;
}

const FAMILY_NAMES = [
  "Corleone",
  "Gambino",
  "Lucchese",
  "Bonanno",
  "Colombo",
  "Genovese",
  "Barzini",
  "Tattaglia",
];

const BIZ_NAMES = [
  "Downtown Bank",
  "Night Club",
  "Auto Garage",
  "Arms Depot",
  "Smuggler's Den",
  "Casino Royale",
  "Harbor Warehouse",
  "Penthouse Suite",
  "Steel Works",
  "Underground Lab",
];

function generateGrid(): CellData[] {
  const cells: CellData[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const r = pseudoRandom(x, y);
      let type: CellType = "empty";
      let owner: string | undefined;
      let name: string | undefined;

      if (r < 0.12) {
        type = "user";
        const ownerHash = Math.floor(pseudoRandom(x + 99, y + 77) * 0xffffff)
          .toString(16)
          .padStart(6, "0");
        owner = `0x${ownerHash}...${ownerHash.slice(0, 4)}`;
        name =
          BIZ_NAMES[
            Math.floor(pseudoRandom(x + 11, y + 23) * BIZ_NAMES.length)
          ];
      } else if (r < 0.16) {
        type = "family-hq";
        name =
          FAMILY_NAMES[
            Math.floor(pseudoRandom(x + 33, y + 44) * FAMILY_NAMES.length)
          ] + " HQ";
        owner = name;
      } else if (r < 0.22) {
        type = "protocol";
        name = "Protocol Asset";
        owner = "PlayMafia Protocol";
      }

      cells.push({ x, y, type, owner, name });
    }
  }
  return cells;
}

// ────────────────────────────────────────────────────────────────
// Popover component
// ────────────────────────────────────────────────────────────────
function CellPopover({
  cell,
  position,
  onClose,
}: {
  cell: CellData;
  position: { x: number; y: number };
  onClose: () => void;
}) {
  const meta = TYPE_META[cell.type];
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="pointer-events-auto absolute z-50 w-56 rounded-lg border border-border bg-popover p-3 shadow-xl"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="h-3 w-3 rounded-sm shrink-0"
          style={{ backgroundColor: meta.fill }}
        />
        <span className="text-xs font-semibold text-foreground">
          {meta.label}
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Coords</span>
          <span className="font-mono text-foreground">
            ({cell.x}, {cell.y})
          </span>
        </div>
        {cell.name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground truncate ml-2 max-w-[120px]">
              {cell.name}
            </span>
          </div>
        )}
        {cell.owner && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Owner</span>
            <span className="font-mono text-foreground truncate ml-2 max-w-[120px]">
              {cell.owner}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Canvas grid
// ────────────────────────────────────────────────────────────────
export function CityMap() {
  const cells = useMemo(generateGrid, []);

  // Transform state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [translateStart, setTranslateStart] = useState({ x: 0, y: 0 });

  // Popover state
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  // Hover state
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      }
    },
    [cells]
  );

  // Redraw on hover change
  useEffect(() => {
    draw(hoveredIdx);
  }, [draw, hoveredIdx]);

  // ── Pan handlers ──
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
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

  // ── Zoom handler ──
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = Math.min(Math.max(scale * factor, 0.3), 5);

      setTranslate({
        x: mx - (mx - translate.x) * (newScale / scale),
        y: my - (my - translate.y) * (newScale / scale),
      });
      setScale(newScale);
    },
    [scale, translate]
  );

  // ── Click handler ──
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
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

      // Position popover relative to container
      const containerRect = containerRef.current!.getBoundingClientRect();
      let px = e.clientX - containerRect.left + 12;
      let py = e.clientY - containerRect.top - 60;

      // Keep popover in bounds
      if (px + 224 > containerRect.width) px = px - 248;
      if (py < 8) py = 8;
      if (py + 120 > containerRect.height) py = containerRect.height - 128;

      setSelectedCell(cell);
      setPopoverPos({ x: px, y: py });
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

  // Counts for legend
  const counts = useMemo(() => {
    const c = { empty: 0, user: 0, "family-hq": 0, protocol: 0 };
    for (const cell of cells) c[cell.type]++;
    return c;
  }, [cells]);

  return (
    <div className="flex flex-col gap-4">
      {/* Map viewport */}
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-hidden rounded-xl border border-border bg-card",
          "h-[calc(100vh-220px)] min-h-[400px]",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
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
            {(
              ["empty", "user", "family-hq", "protocol"] as CellType[]
            ).map((t) => (
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
          </div>
        </div>

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
            {cells[hoveredIdx].type !== "empty" && (
              <span className="ml-2 text-xs text-muted-foreground">
                {TYPE_META[cells[hoveredIdx].type].label}
              </span>
            )}
          </div>
        )}

        {/* Cell popover */}
        {selectedCell && (
          <CellPopover
            cell={selectedCell}
            position={popoverPos}
            onClose={() => setSelectedCell(null)}
          />
        )}
      </div>

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
          <span className="font-mono text-foreground">
            {counts.user + counts["family-hq"] + counts.protocol}
          </span>
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Scroll to zoom, drag to pan, click for details
        </span>
      </div>
    </div>
  );
}
