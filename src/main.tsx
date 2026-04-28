import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import App from "./App.tsx";
import "./index.css";

// Native mobile setup (only runs inside the Capacitor shell, not the web preview)
if (Capacitor.isNativePlatform()) {
  // Hide the native splash once the web app has hydrated
  window.addEventListener("load", () => {
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    }, 600);
  });

  // Match the dark luxury theme on the native status bar
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#0a0a0b" }).catch(() => {});
}

// Auto-recover from stale chunk references after a new deploy (PWA cache).
// When a dynamic import fails because the hashed file no longer exists,
// reload once to fetch the fresh index.html and chunk map.
const CHUNK_RELOAD_KEY = "chunk-reload-attempt";
const isChunkLoadError = (msg: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);

window.addEventListener("error", (e) => {
  if (e?.message && isChunkLoadError(e.message) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = String(e?.reason?.message ?? e?.reason ?? "");
  if (isChunkLoadError(msg) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
});

// Manually register the PWA service worker with an ABSOLUTE path so it works
// regardless of the current route (vite `base: "./"` would otherwise resolve
// `sw.js` relative to the path, e.g. `/student/sw.js` → 404).
if ("serviceWorker" in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener("load", () => {
    const swUrl = import.meta.env.DEV ? "/dev-sw.js?dev-sw" : "/sw.js";
    const swType: WorkerType = import.meta.env.DEV ? "module" : "classic";
    navigator.serviceWorker
      .register(swUrl, { scope: "/", type: swType })
      .catch(() => {
        // Silent — SW is a progressive enhancement
      });
  });
}


createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
