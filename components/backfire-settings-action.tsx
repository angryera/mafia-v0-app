"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Crosshair, Loader2, RotateCcw, Save, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  BACKFIRE_MAX_BULLETS,
  BACKFIRE_MIN_BULLETS,
  BACKFIRE_MODE_OPTIONS,
  BackfireMode,
  clampBulletAmount,
  getDefaultBackfireSettings,
  loadBackfireSettings,
  normalizeBackfireSettings,
  saveBackfireSettings,
  type BackfireSettings,
} from "@/lib/backfireContract";

// ── Local draft shape ────────────────────────────────────────────────────────
// The UI works with a single bullet amount; it is mirrored into rangeMin/rangeMax
// only at commit time (see buildSettings).
interface BackfireDraft {
  mode: number;
  bulletAmount: number;
}

function settingsToDraft(s: BackfireSettings): BackfireDraft {
  return { mode: s.mode, bulletAmount: s.rangeMin };
}

function buildSettings(
  draft: BackfireDraft,
  previous: BackfireSettings,
): BackfireSettings {
  // For Range, the entered amount is stored in BOTH rangeMin and rangeMax.
  // For every other mode, keep the previous/default range values untouched.
  if (draft.mode === BackfireMode.Range) {
    const amount = clampBulletAmount(draft.bulletAmount);
    return { mode: draft.mode, rangeMin: amount, rangeMax: amount };
  }
  return {
    mode: draft.mode,
    rangeMin: previous.rangeMin,
    rangeMax: previous.rangeMax,
  };
}

// ── Option card ──────────────────────────────────────────────────────────────
function ModeCard({
  title,
  description,
  selected,
  disabled,
  onSelect,
}: {
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      onSelect();
    }
  }

  return (
    <div
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "pointer-events-none opacity-50",
        selected
          ? "border-primary bg-primary/10 shadow-[0_0_0_1px] shadow-primary/40"
          : "border-border bg-card hover:border-primary/40 hover:bg-card/80",
      )}
    >
      {/* Radio indicator */}
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected
            ? "border-primary"
            : "border-muted-foreground/40 group-hover:border-primary/50",
        )}
      >
        {selected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={cn(
            "text-sm font-semibold",
            selected ? "text-foreground" : "text-foreground/90",
          )}
        >
          {title}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function BackfireSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 animate-pulse"
        >
          <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-secondary/60" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-48 rounded bg-secondary/60" />
            <div className="h-3 w-full max-w-md rounded bg-secondary/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function BackfireSettingsAction() {
  const { address } = useAccount();
  const { toast } = useToast();

  // Committed (last-saved) settings = source of truth mirror.
  const [committed, setCommitted] = useState<BackfireSettings>(
    getDefaultBackfireSettings,
  );
  // Draft = staged edits not yet committed.
  const [draft, setDraft] = useState<BackfireDraft>(() =>
    settingsToDraft(getDefaultBackfireSettings()),
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load (future: read from contract for the connected wallet) ─────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The mock currently ignores the wallet; the real contract read will use it.
      const result = await loadBackfireSettings(address);
      const normalized = normalizeBackfireSettings(result);
      setCommitted(normalized);
      setDraft(settingsToDraft(normalized));
    } catch {
      const fallback = getDefaultBackfireSettings();
      setCommitted(fallback);
      setDraft(settingsToDraft(fallback));
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Load on mount and whenever the connected account changes.
  useEffect(() => {
    load();
  }, [load]);

  // ── Derived: unsaved changes ───────────────────────────────────────────────
  const hasUnsavedChanges = useMemo(() => {
    if (draft.mode !== committed.mode) return true;
    if (draft.mode === BackfireMode.Range) {
      return clampBulletAmount(draft.bulletAmount) !== committed.rangeMin;
    }
    return false;
  }, [draft, committed]);

  const isRange = draft.mode === BackfireMode.Range;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleSelectMode(mode: BackfireMode) {
    setDraft((prev) => ({ ...prev, mode }));
  }

  function handleBulletChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (raw === "") {
      setDraft((prev) => ({ ...prev, bulletAmount: NaN }));
      return;
    }
    setDraft((prev) => ({ ...prev, bulletAmount: Number(raw) }));
  }

  function handleReset() {
    setDraft(settingsToDraft(committed));
  }

  async function handleSave() {
    // ── Validation / normalization (before the contract call) ────────────────
    if (draft.mode === BackfireMode.Range) {
      const entered = draft.bulletAmount;
      if (!Number.isFinite(entered) || entered < BACKFIRE_MIN_BULLETS) {
        toast({ title: "Enter a valid bullet amount to shoot." });
        return;
      }
      const normalizedAmount = clampBulletAmount(entered);
      if (
        normalizedAmount < BACKFIRE_MIN_BULLETS ||
        normalizedAmount > BACKFIRE_MAX_BULLETS
      ) {
        toast({
          title: "Bullet amount must be between 1 and 200,000.",
        });
        return;
      }
    }

    const next = buildSettings(draft, committed);

    setSaving(true);
    try {
      // MOCK contract write (pending → success). Swap for real wallet write.
      const saved = await saveBackfireSettings(next, address);
      const normalized = normalizeBackfireSettings(saved);
      setCommitted(normalized);
      setDraft(settingsToDraft(normalized));
      toast({ title: "Backfire settings saved." });
    } catch {
      toast({
        title: "Failed to save backfire settings. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Crosshair className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Backfire settings
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Choose how you automatically return fire when another player attacks
            you. Default is no backfire until you change it.
          </p>
        </div>
      </div>

      {loading ? (
        <BackfireSkeleton />
      ) : (
        <>
          {/* Option cards */}
          <div
            role="radiogroup"
            aria-label="Backfire mode"
            className="flex flex-col gap-3"
          >
            {BACKFIRE_MODE_OPTIONS.map((opt) => (
              <ModeCard
                key={opt.mode}
                title={opt.title}
                description={opt.description}
                selected={draft.mode === opt.mode}
                disabled={saving}
                onSelect={() => handleSelectMode(opt.mode)}
              />
            ))}
          </div>

          {/* Bullet amount (only for Range mode) */}
          {isRange && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-4">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Bullet amount
                </p>
                <p className="text-xs text-muted-foreground">
                  How many bullets to shoot when backfiring (
                  {BACKFIRE_MIN_BULLETS.toLocaleString()}–
                  {BACKFIRE_MAX_BULLETS.toLocaleString()}).
                </p>
              </div>

              <label
                htmlFor="backfire-bullets"
                className="mt-1 text-xs font-medium text-muted-foreground"
              >
                Bullets to shoot
              </label>
              <div className="relative">
                <Target className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  id="backfire-bullets"
                  type="number"
                  inputMode="numeric"
                  min={BACKFIRE_MIN_BULLETS}
                  max={BACKFIRE_MAX_BULLETS}
                  step={1}
                  disabled={saving}
                  value={Number.isFinite(draft.bulletAmount) ? draft.bulletAmount : ""}
                  onChange={handleBulletChange}
                  placeholder="e.g. 1,000"
                  className="pl-9 font-mono tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Action row */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving || !hasUnsavedChanges}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset changes
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
