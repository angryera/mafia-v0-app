"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSwitchChain, useAccount } from "wagmi";
import {
  type ChainId,
  type ChainConfig,
  CHAIN_CONFIGS,
} from "@/lib/contract";

type ChainContextType = {
  activeChain: ChainId;
  chainConfig: ChainConfig;
  setActiveChain: (chain: ChainId) => void;
  isSwitching: boolean;
};

const ChainContext = createContext<ChainContextType>({
  activeChain: "pulse",
  chainConfig: CHAIN_CONFIGS.pulse,
  setActiveChain: () => { },
  isSwitching: false,
});

export function useChain() {
  return useContext(ChainContext);
}

export function useChainAddresses() {
  const { chainConfig } = useContext(ChainContext);
  return chainConfig.addresses;
}

export function useChainExplorer() {
  const { chainConfig } = useContext(ChainContext);
  return chainConfig.explorer;
}

export function ChainProvider({ children }: { children: ReactNode }) {
  const [activeChain, setActiveChainState] = useState<ChainId>("pulse");
  const [isSwitching, setIsSwitching] = useState(false);
  const { switchChainAsync } = useSwitchChain();
  const { isConnected } = useAccount();

  const setActiveChain = useCallback(
    async (chain: ChainId) => {
      const targetWagmiChainId = CHAIN_CONFIGS[chain].wagmiChainId;

      if (isConnected && switchChainAsync) {
        setIsSwitching(true);
        try {
          await switchChainAsync({ chainId: targetWagmiChainId });
          setActiveChainState(chain);
        } catch {
          // User rejected or switch failed -- stay on current chain
        } finally {
          setIsSwitching(false);
        }
      } else {
        // No wallet connected, just switch the UI chain
        setActiveChainState(chain);
      }
    },
    [isConnected, switchChainAsync],
  );

  return (
    <ChainContext.Provider
      value={{
        activeChain,
        chainConfig: CHAIN_CONFIGS[activeChain],
        setActiveChain,
        isSwitching,
      }}
    >
      <div data-chain={activeChain} className="contents">
        {children}
      </div>
    </ChainContext.Provider>
  );
}
