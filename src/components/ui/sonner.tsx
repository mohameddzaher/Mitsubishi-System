"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-subtle)",
          color: "var(--color-text-primary)",
          fontSize: "12.5px",
        },
      }}
    />
  );
}
