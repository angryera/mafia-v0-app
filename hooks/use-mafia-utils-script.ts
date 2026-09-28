"use client";

import { useCallback, useSyncExternalStore } from "react";
import "@/types/mafia-globals";

const MAFIA_UTILS_SRC = "/js/mafia-utils.js";

export type MafiaUtilsGlobal =
  | "MafiaInventory"
  | "MafiaMapApi"
  | "MafiaMap"
  | "MafiaFamily"
  | "MafiaProfile"
  | "MafiaDeposit"
  | "MafiaWorth"
  | "MafiaRaceLobby"
  | "MafiaExchange";

export type MafiaUtilsScriptStatus = "loading" | "ready" | "error";

type ScriptLoadState = "pending" | "settled" | "failed";

let scriptLoadState: ScriptLoadState = "pending";
let scriptWatched = false;
const listeners = new Set<() => void>();

function setScriptLoadState(state: ScriptLoadState) {
  scriptLoadState = state;
  listeners.forEach((listener) => listener());
}

function watchScript() {
  if (scriptWatched) return;
  scriptWatched = true;

  let script = document.querySelector<HTMLScriptElement>(`script[src="${MAFIA_UTILS_SRC}"]`);
  if (!script) {
    script = document.createElement("script");
    script.src = MAFIA_UTILS_SRC;
    script.async = true;
    document.body.appendChild(script);
  }
  script.addEventListener("load", () => setScriptLoadState("settled"), { once: true });
  script.addEventListener("error", () => setScriptLoadState("failed"), { once: true });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  watchScript();
  return () => {
    listeners.delete(listener);
  };
}

function getServerSnapshot(): MafiaUtilsScriptStatus {
  return "loading";
}

/**
 * Tracks when `/js/mafia-utils.js` has exposed `window[globalName]`.
 * The root layout already loads the script; it is only injected when missing.
 */
export function useMafiaUtilsScript(globalName: MafiaUtilsGlobal): MafiaUtilsScriptStatus {
  const getSnapshot = useCallback((): MafiaUtilsScriptStatus => {
    if (window[globalName]) return "ready";
    return scriptLoadState === "pending" ? "loading" : "error";
  }, [globalName]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
