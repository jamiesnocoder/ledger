import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ledger",
    short_name: "Ledger",
    description: "A minimal net worth and spending tracker.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a09",
    theme_color: "#0a0a09",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home screen icon for quick actions - the closest a PWA
    // gets to a native widget shortcut.
    shortcuts: [
      {
        name: "Add Expense",
        short_name: "Expense",
        url: "/?add=expense",
        description: "Log a new expense",
      },
      {
        name: "Add Cash",
        short_name: "Cash",
        url: "/?add=cash",
        description: "Log cash in or out",
      },
      {
        name: "Transfer",
        short_name: "Transfer",
        url: "/?add=transfer",
        description: "Move money between accounts",
      },
    ],
  };
}
