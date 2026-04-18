import type { Metadata, Viewport } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MELSA Mecca",
    template: "%s · MELSA Mecca",
  },
  description:
    "Mitsubishi Electric Saudi — Makkah Regional Office · Elevators, Escalators & Moving Walks",
  applicationName: "MELSA Mecca",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0B0D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} data-theme="dark">
      <body className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] antialiased">
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
