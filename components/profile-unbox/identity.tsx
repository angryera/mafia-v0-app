import { formatEllipsisAddress } from "@/lib/format";
import {
  formatRewardRange,
  formatTierPrice,
  type ProfileTier,
  type RewardKey,
} from "@/lib/profile-unbox";

const HIGHLIGHTS: { key: RewardKey; label: string }[] = [
  { key: "rank", label: "Rank" },
  { key: "cash", label: "Cash" },
  { key: "bullets", label: "Bullets" },
  { key: "health", label: "Health" },
];

interface IdentityProps {
  existing: boolean;
  name: string;
  country: string;
  gender: 0 | 1 | null;
  chainLabel: string;
  referrer?: string;
  account: string;
  tier: ProfileTier;
}

export function ProfileIdentityCard({
  existing,
  name,
  country,
  gender,
  chainLabel,
  referrer,
  account,
  tier,
}: IdentityProps) {
  const genderLabel = gender === 0 ? "Male" : gender === 1 ? "Female" : "Unlisted";

  return (
    <aside className="overflow-hidden rounded-xl border border-border bg-card" aria-label="Selected player details">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <span
          className="grid h-10 w-10 place-items-center rounded-full font-mono text-sm"
          style={{ color: "var(--unbox-accent)", background: "color-mix(in srgb, var(--unbox-accent) 16%, transparent)" }}
        >
          {account.slice(2, 4).toUpperCase()}
        </span>
        <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em]">
          {existing ? "ACTIVE PLAYER" : "PLAYER PREVIEW"}
        </span>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Your player</p>
          <strong className="mt-1 block text-lg">{name}</strong>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Country</dt><dd>{country}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Gender</dt><dd>{genderLabel}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Network</dt><dd>{chainLabel}</dd></div>
          {referrer && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Referrer</dt>
              <dd className="font-mono text-xs">{formatEllipsisAddress(referrer)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Wallet</dt>
            <dd className="font-mono text-xs" title={account}>{formatEllipsisAddress(account)}</dd>
          </div>
        </dl>
        <div className="rounded-lg border border-white/10 p-3" style={{ borderColor: "var(--unbox-accent)" }}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Selected tier</p>
          <p className="mt-1 flex items-baseline justify-between gap-2">
            <strong>{tier.label}</strong>
            <span className="font-mono text-sm">{formatTierPrice(tier.priceUsdWei)}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {existing ? "Applied to your profile" : "Possible starting values"}
          </p>
          <dl className="mt-3 space-y-1.5 text-xs">
            {HIGHLIGHTS.map(({ key, label }) => (
              <div key={key} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right font-mono">{formatRewardRange(key, tier.rewards[key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </aside>
  );
}
