import type { Metadata, Viewport } from "next";
import { Geist, Unbounded } from "next/font/google";
import { ThemeScript } from "@/components/ThemeScript";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

// Vercel's Geist - the closest freely-licensable match to Apple's SF Pro,
// self-hosted by Next.js (no external Google Fonts request at runtime).
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

// Unbounded Bold - the "Ledger" wordmark's typeface per the brand kit.
// Used only for the wordmark (Wordmark.tsx), not body text.
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-wordmark",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ledger",
  description: "A minimal net worth and spending tracker.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ledger",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f3" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${geist.variable} ${unbounded.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <ToastProvider>
          <div id="shell">{children}</div>
        </ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
