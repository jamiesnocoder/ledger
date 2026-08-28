"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

// Single shared browser client - every client component that mutates data
// (the add sheets, settings) imports this rather than creating its own.
export function getSupabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
