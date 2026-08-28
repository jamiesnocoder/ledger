import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/ThemeScript";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

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
    { media: "(prefers-color-scheme: light)", color: "#f5f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a09" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
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
