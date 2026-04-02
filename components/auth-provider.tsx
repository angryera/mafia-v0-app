"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useChain } from "@/components/chain-provider";

type AuthData = {
  message: string;
  signature: `0x${string}`;
} | null;

type AuthContextType = {
  authData: AuthData;
  isSigning: boolean;
  signError: boolean;
  requestSignature: () => void;
};

const AuthContext = createContext<AuthContextType>({
  authData: null,
  isSigning: false,
  signError: false,
  requestSignature: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { chainConfig } = useChain();

  const [authData, setAuthData] = useState<AuthData>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState(false);

  const requestSignature = async () => {
    if (!address) return;
    setIsSigning(true);
    setSignError(false);
    try {
      const threeDaysInSeconds = 3 * 24 * 60 * 60;
      const utcTimestamp = Math.floor(Date.now() / 1000) + threeDaysInSeconds;
      const msg = `"Sign this message with ${address} - expire at ${utcTimestamp}"`;
      const sig = await signMessageAsync({ message: msg });
      setAuthData({ message: msg, signature: sig });
    } catch {
      setSignError(true);
    } finally {
      setIsSigning(false);
    }
  };

  // Auto-sign on connect
  useEffect(() => {
    if (isConnected && address && !authData && !isSigning && !signError) {
      requestSignature();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // Reset on wallet or chain change
  useEffect(() => {
    setAuthData(null);
    setSignError(false);
    setIsSigning(false);
  }, [address, chainConfig.id]);

  return (
    <AuthContext.Provider
      value={{ authData, isSigning, signError, requestSignature }}
    >
      {children}
    </AuthContext.Provider>
  );
}
