"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "./ui/sonner";
import { TooltipProvider } from "./ui/tooltip";

export function Providers({
  children,
  messages,
  locale,
}: {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  locale: string;
}) {
  const [qc] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Riyadh">
        <QueryClientProvider client={qc}>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
