"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRIES } from "@/lib/countries";
import {
  normalizeProfileName,
  referralFieldError,
  referralFromQuery,
  validateProfileName,
  type ProfileSignupDraft,
} from "@/lib/profile-unbox";
import { cn } from "@/lib/utils";

interface SignupProps {
  account?: `0x${string}`;
  chainLabel: string;
  onCheckName: (name: string) => Promise<string>;
  onNext: (draft: ProfileSignupDraft) => void;
}

export function ProfileSignup({ account, chainLabel, onCheckName, onNext }: SignupProps) {
  const { openConnectModal } = useConnectModal();
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [gender, setGender] = useState<0 | 1 | null>(null);
  const [country, setCountry] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [referrer, setReferrer] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const code = referralFromQuery(new URLSearchParams(window.location.search).get("ref"));
    if (code) setReferrer((current) => current || code);
  }, []);

  const matches = COUNTRIES.filter((entry) =>
    entry.name.toLowerCase().includes(countryQuery.trim().toLowerCase()),
  ).slice(0, 40);

  const chooseGender = (next: 0 | 1) => {
    setGender(next);
    setErrors((current) => ({ ...current, gender: "" }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) return;
    const nextErrors: Record<string, string> = {};
    const nameError = validateProfileName(name);
    if (nameError) nextErrors.name = nameError;
    if (gender === null) nextErrors.gender = "Select a gender.";
    if (!country) nextErrors.country = "Select a country.";
    const referrerError = referralFieldError(referrer, account);
    if (referrerError) nextErrors.referrer = referrerError;
    setNameTouched(true);
    if (Object.keys(nextErrors).length > 0 || gender === null) {
      setErrors(nextErrors);
      return;
    }

    setBusy(true);
    setErrors({});
    try {
      const chainError = await onCheckName(name);
      if (chainError) {
        setErrors({ name: chainError });
        document.getElementById("signup-name")?.focus();
        return;
      }
      onNext({
        account,
        name,
        gender,
        country,
        referrer: referrer as `0x${string}` | "",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="profile-signup-title">
      <form className="rounded-xl border border-border bg-card p-5" onSubmit={submit} noValidate>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Player details</p>
            <h2 id="profile-signup-title" className="mt-1 text-xl font-semibold">Who will you become?</h2>
          </div>
          <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{chainLabel}</span>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">Choose your character details. You can review the unboxing tiers next.</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signup-name">Character name</Label>
            <Input
              id="signup-name"
              aria-label="Character name"
              value={name}
              autoComplete="off"
              placeholder="Type character name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "signup-name-error" : undefined}
              onChange={(event) => {
                const value = normalizeProfileName(event.target.value).slice(0, 32);
                setName(value);
                setNameTouched(true);
                setErrors((current) => ({
                  ...current,
                  name: value ? validateProfileName(value) : "Enter a character name.",
                  form: "",
                }));
              }}
            />
            {(nameTouched || errors.name) && errors.name && (
              <small id="signup-name-error" className="text-xs text-red-400" role="alert">{errors.name}</small>
            )}
          </div>

          <div className="space-y-2">
            <Label id="signup-gender-label">Gender</Label>
            <div role="radiogroup" aria-labelledby="signup-gender-label" className="grid grid-cols-2 gap-2">
              {([
                [0, "Male"],
                [1, "Female"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  id={value === 0 ? "signup-gender" : undefined}
                  type="button"
                  role="radio"
                  aria-checked={gender === value}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    gender === value ? "border-[var(--unbox-accent)] bg-white/5" : "border-border hover:border-white/20",
                  )}
                  onClick={() => chooseGender(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {errors.gender && <small id="signup-gender-error" className="text-xs text-red-400" role="alert">{errors.gender}</small>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-country">Country</Label>
            <Input
              id="signup-country"
              aria-label="Country"
              value={countryOpen ? countryQuery : country}
              placeholder="Search for a country"
              autoComplete="off"
              aria-invalid={Boolean(errors.country)}
              aria-expanded={countryOpen}
              aria-controls="signup-country-list"
              onFocus={() => {
                setCountryOpen(true);
                setCountryQuery(country);
              }}
              onChange={(event) => {
                setCountryQuery(event.target.value);
                setCountry("");
                setCountryOpen(true);
                setErrors((current) => ({ ...current, country: "" }));
              }}
            />
            {countryOpen && (
              <div id="signup-country-list" role="listbox" aria-label="Countries" className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background">
                {matches.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No countries found</p>}
                {matches.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    role="option"
                    aria-selected={country === entry.name}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      setCountry(entry.name);
                      setCountryQuery(entry.name);
                      setCountryOpen(false);
                    }}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>
            )}
            {errors.country && <small id="signup-country-error" className="text-xs text-red-400" role="alert">{errors.country}</small>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-referrer">Referral wallet <span className="text-muted-foreground">Optional</span></Label>
            <Input
              id="signup-referrer"
              aria-label="Referral wallet"
              value={referrer}
              autoComplete="off"
              placeholder="0x..."
              onChange={(event) => {
                setReferrer(event.target.value.trim());
                setErrors((current) => ({ ...current, referrer: "" }));
              }}
            />
            {errors.referrer && <small className="text-xs text-red-400" role="alert">{errors.referrer}</small>}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Your details stay in this page session until you submit them to the contract.</span>
          <span className={account ? "text-foreground" : undefined}>{account ? "Wallet connected" : "Wallet not connected"}</span>
        </div>
        {errors.wallet && <small className="mt-2 block text-xs text-red-400" role="alert">{errors.wallet}</small>}

        <div className="mt-4">
          {!account ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                if (!openConnectModal) {
                  setErrors((current) => ({ ...current, wallet: "Wallet connection failed. Try again." }));
                  return;
                }
                openConnectModal();
              }}
            >
              Connect wallet
            </Button>
          ) : (
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Checking name..." : "Next: choose tier"}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
