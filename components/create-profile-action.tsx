"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Check,
  Loader2,
  User,
  Users,
  Globe,
  Wallet,
} from "lucide-react";
import { useChainAddresses } from "@/components/chain-provider";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { USER_PROFILE_CONTRACT_ABI } from "@/lib/contract";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { isAddress } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_NAME_LENGTH = 14;

// Format profile name: First letter uppercase, rest lowercase
function formatProfileName(value: string): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

// Validate profile name: Only letters, starts with uppercase
function validateProfileName(name: string): { valid: boolean; error?: string } {
  if (!name) {
    return { valid: false, error: "Profile name is required" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Maximum ${MAX_NAME_LENGTH} characters allowed` };
  }
  const regex = /^[A-Z][a-z]*$/;
  if (!regex.test(name)) {
    return { valid: false, error: "Only letters allowed (e.g., Michael, Sarah)" };
  }
  return { valid: true };
}

export function CreateProfileAction() {
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { writeContractAsync, isPending } = useChainWriteContract();

  // Form state
  const [profileName, setProfileName] = useState("");
  const [referralAddress, setReferralAddress] = useState("");
  const [gender, setGender] = useState<"0" | "1">("0");
  const [country, setCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");

  // Validation state
  const [nameError, setNameError] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);

  // Transaction state
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if name is taken
  const { data: isTaken, refetch: refetchNameCheck } = useReadContract({
    address: addresses.userProfile,
    abi: USER_PROFILE_CONTRACT_ABI,
    functionName: "isTakenName",
    args: profileName ? [profileName] : undefined,
    query: { enabled: false },
  });

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Debounced name check
  useEffect(() => {
    const validation = validateProfileName(profileName);
    if (!validation.valid) {
      setNameError(validation.error || null);
      setNameAvailable(null);
      return;
    }

    setNameError(null);
    setIsCheckingName(true);

    const timeoutId = setTimeout(async () => {
      try {
        const result = await refetchNameCheck();
        const taken = result.data as boolean;
        setNameAvailable(!taken);
        if (taken) {
          setNameError("This name is already taken");
        }
      } catch {
        setNameError("Failed to check name availability");
      } finally {
        setIsCheckingName(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [profileName, refetchNameCheck]);

  // Validate referral address
  useEffect(() => {
    if (!referralAddress) {
      setReferralError(null);
      return;
    }
    if (!isAddress(referralAddress)) {
      setReferralError("Invalid wallet address");
    } else if (referralAddress.toLowerCase() === address?.toLowerCase()) {
      setReferralError("Cannot use your own address as referral");
    } else {
      setReferralError(null);
    }
  }, [referralAddress, address]);

  // Handle name input
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-zA-Z]/g, "");
    const formatted = formatProfileName(raw);
    setProfileName(formatted);
  }, []);

  // Filter countries based on search
  const filteredCountries = countrySearch
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : COUNTRIES;

  // Check if form is valid
  const isFormValid =
    isConnected &&
    profileName &&
    !nameError &&
    nameAvailable === true &&
    !referralError &&
    country &&
    !isPending &&
    !isConfirming;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !address) return;

    setSubmitError(null);
    try {
      const finalReferralAddress = referralAddress && isAddress(referralAddress)
        ? referralAddress
        : ZERO_ADDRESS;

      const hash = await writeContractAsync({
        address: addresses.userProfile,
        abi: USER_PROFILE_CONTRACT_ABI,
        functionName: "createProfile",
        args: [
          profileName,
          BigInt(0), // swapTokenId — 0 when not using a swap / starter token
          finalReferralAddress as `0x${string}`,
          Number(gender),
          country,
          BigInt(0), // imageId — default avatar until profile image UI exists
        ],
      });

      setTxHash(hash);
    } catch (err) {
      console.error("Error creating profile:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to create profile");
    }
  };

  if (!isConnected) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold text-foreground">Connect Wallet</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Please connect your wallet to create a profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isSuccess) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Profile Created!</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Welcome to the game, <span className="font-medium text-primary">{profileName}</span>!
          </p>
          <Button
            onClick={() => window.location.href = "/"}
            className="mt-6"
          >
            Enter the Game
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Create Your Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Name */}
          <div className="space-y-2">
            <Label htmlFor="profileName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Profile Name
            </Label>
            <div className="relative">
              <Input
                id="profileName"
                placeholder="Enter your name (e.g., Michael)"
                value={profileName}
                onChange={handleNameChange}
                maxLength={MAX_NAME_LENGTH}
                className={cn(
                  "pr-10",
                  nameError && "border-red-500 focus-visible:ring-red-500",
                  nameAvailable === true && "border-green-500 focus-visible:ring-green-500"
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingName && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isCheckingName && nameAvailable === true && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {!isCheckingName && nameError && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className={cn(
                "text-xs",
                nameError ? "text-red-500" : nameAvailable === true ? "text-green-500" : "text-muted-foreground"
              )}>
                {nameError || (nameAvailable === true ? "Name is available!" : "Letters only, max 14 characters")}
              </p>
              <span className="text-xs text-muted-foreground">
                {profileName.length}/{MAX_NAME_LENGTH}
              </span>
            </div>
          </div>

          {/* Gender Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Gender
            </Label>
            <RadioGroup
              value={gender}
              onValueChange={(val) => setGender(val as "0" | "1")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="0" id="male" />
                <Label htmlFor="male" className="cursor-pointer font-normal">
                  Male
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="female" />
                <Label htmlFor="female" className="cursor-pointer font-normal">
                  Female
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Country Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Country
            </Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className={cn(!country && "text-muted-foreground")}>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <div className="p-2">
                  <Input
                    placeholder="Search countries..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="mb-2"
                  />
                </div>
                {filteredCountries.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
                {filteredCountries.length === 0 && (
                  <p className="p-2 text-center text-sm text-muted-foreground">
                    No countries found
                  </p>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Referral Address (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="referral" className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Referral Address
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="referral"
              placeholder="0x..."
              value={referralAddress}
              onChange={(e) => setReferralAddress(e.target.value)}
              className={cn(
                referralError && "border-red-500 focus-visible:ring-red-500"
              )}
            />
            {referralError && (
              <p className="text-xs text-red-500">{referralError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Enter the wallet address of the player who referred you
            </p>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isFormValid}
            className="w-full"
            size="lg"
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isPending ? "Confirm in Wallet..." : "Creating Profile..."}
              </>
            ) : (
              "Create Profile"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
