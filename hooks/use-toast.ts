"use client";

import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

type ToastOptions = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive";
};

/**
 * Compatibility wrapper for components that still use the former shadcn
 * `useToast` call shape. All notifications are rendered by Sonner.
 */
function toast({ title, description, variant = "default" }: ToastOptions) {
  const message = title ?? description ?? "Notification";
  const options = title ? { description } : undefined;

  return variant === "destructive"
    ? sonnerToast.error(message, options)
    : sonnerToast(message, options);
}

function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}

export { useToast, toast };
