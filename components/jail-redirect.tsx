"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { useChainAddresses } from "@/components/chain-provider";
import { JAIL_CONTRACT_ABI } from "@/lib/contract";
import { usePlayerDeadState } from "@/hooks/use-player-dead-state";

/** Send a jailed player to the jail page so they can buy themselves out. */
export function JailRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const addresses = useChainAddresses();
  const { isDead, profileLoaded } = usePlayerDeadState();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const { data: jailedUntilRaw } = useReadContract({
    address: addresses.jail,
    abi: JAIL_CONTRACT_ABI,
    functionName: "jailedUntil",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address, refetchInterval: 10_000 },
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const jailedUntil = jailedUntilRaw !== undefined ? Number(jailedUntilRaw) : null;
  const isInJail = isConnected && jailedUntil !== null && jailedUntil > now;
  const dead = profileLoaded && isDead;

  useEffect(() => {
    if (!isInJail || dead || pathname === "/jail") return;
    router.replace("/jail");
  }, [isInJail, dead, pathname, router]);

  return null;
}
