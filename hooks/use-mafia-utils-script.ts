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

function injectScript(): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = MAFIA_UTILS_SRC;
  script.async = true;
  document.body.appendChild(script);
  return script;
}

function setScriptLoadState(state: ScriptLoadState) {
  scriptLoadState = state;
  listeners.forEach((listener) => listener());
}

const MAFIA_GLOBALS: readonly MafiaUtilsGlobal[] = [
  "MafiaInventory",
  "MafiaMapApi",
  "MafiaMap",
  "MafiaFamily",
  "MafiaProfile",
  "MafiaDeposit",
  "MafiaWorth",
  "MafiaRaceLobby",
  "MafiaExchange",
];

function watchScript() {
  if (scriptWatched) return;
  scriptWatched = true;

  // The layout script usually finished before React subscribed, so its load
  // event is already gone. Treat any exposed global as proof that it ran.
  if (MAFIA_GLOBALS.some((name) => window[name])) {
    scriptLoadState = "settled";
    return;
  }

  const script = document.querySelector<HTMLScriptElement>(`script[src="${MAFIA_UTILS_SRC}"]`)
    ?? injectScript();
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
