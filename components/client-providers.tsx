"use client";

import { type ReactNode, useState, useEffect, useMemo, useRef } from "react";
import { Toaster } from "sonner";
import { WagmiProvider, http, createConfig } from "wagmi";
import { bsc } from "wagmi/chains";
import { type Chain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  trustWallet,
  rabbyWallet,
} from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";
import { AuthProvider } from "@/components/auth-provider";
import { ChainProvider, useChain } from "@/components/chain-provider";

const pulsechain: Chain = {
  id: 369,
  name: "PulseChain",
  nativeCurrency: { name: "PLS", symbol: "PLS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.pulsechain.com"] },
  },
  blockExplorers: {
    default: { name: "PulseScan", url: "https://scan.pulsechain.com" },
  },
};

const chains = [bsc, pulsechain] as const;

// Singleton pattern - create once and reuse
let wagmiConfigSingleton: ReturnType<typeof createConfig> | null = null;
let queryClientSingleton: QueryClient | null = null;

function getOrCreateWagmiConfig() {
  if (!wagmiConfigSingleton) {
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Popular",
          wallets: [
            injectedWallet,
            metaMaskWallet,
            coinbaseWallet,
            trustWallet,
            rabbyWallet,
          ],
        },
      ],
      {
        appName: "Playmafia",
        projectId: "optional",
      }
    );

    wagmiConfigSingleton = createConfig({
      connectors,
      chains,
      transports: {
        [bsc.id]: http("https://bsc-dataseed1.binance.org"),
        [pulsechain.id]: http("https://rpc.pulsechain.com"),
      },
      ssr: true, // Enable SSR support
    });
  }
  return wagmiConfigSingleton;
}

function getOrCreateQueryClient() {
  if (!queryClientSingleton) {
    queryClientSingleton = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return queryClientSingleton;
}

const CHAIN_ACCENT_COLORS: Record<string, string> = {
  bnb: "hsl(43, 96%, 56%)",
  pulsechain: "hsl(330, 90%, 60%)",
};

function DynamicRainbowKit({ children }: { children: ReactNode }) {
  const { activeChain } = useChain();

  const theme = useMemo(
    () =>
      darkTheme({
        accentColor: CHAIN_ACCENT_COLORS[activeChain] ?? CHAIN_ACCENT_COLORS.bnb,
        accentColorForeground: "hsl(220, 20%, 4%)",
        borderRadius: "medium",
        fontStack: "system",
      }),
    [activeChain],
  );

  return <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>;
}

export default function ClientProviders({
  children,
}: {
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  
  // Use refs to store configs - avoids state updates during render
  const wagmiConfigRef = useRef<ReturnType<typeof createConfig> | null>(null);
  const queryClientRef = useRef<QueryClient | null>(null);

  // Initialize refs synchronously on first render (client-side only)
  if (typeof window !== "undefined" && !wagmiConfigRef.current) {
    wagmiConfigRef.current = getOrCreateWagmiConfig();
    queryClientRef.current = getOrCreateQueryClient();
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before mount, render nothing to avoid hydration mismatch
  if (!mounted || !wagmiConfigRef.current || !queryClientRef.current) {
    return null;
  }

  return (
    <WagmiProvider config={wagmiConfigRef.current}>
      <QueryClientProvider client={queryClientRef.current}>
        <ChainProvider>
          <DynamicRainbowKit>
            <AuthProvider>
              {children}
              <Toaster
                theme="dark"
                position="top-center"
                richColors
                toastOptions={{
                  style: {
                    maxWidth: "92vw",
                  },
                }}
                expand
                visibleToasts={3}
              />
            </AuthProvider>
          </DynamicRainbowKit>
        </ChainProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
