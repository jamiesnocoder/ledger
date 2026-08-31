"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Cache-first static assets make sense for production's hashed chunk
    // filenames, but under `next dev` the same URL keeps changing content -
    // registering there just pins the browser to a stale, pre-edit bundle.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Offline shell is a nice-to-have, not required for the app to work.
      });
    }
  }, []);
  return null;
}
