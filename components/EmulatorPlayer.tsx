"use client";

import { useEffect } from "react";

// EmulatorJS reads a set of `window.EJS_*` globals, so we augment the type.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
}

/** Stable positive integer from a cuid — EmulatorJS wants a numeric game id. */
function numericId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

// Module-scope guard: which game the EmulatorJS loader has already booted.
// Survives React StrictMode's dev double-mount (a component ref would reset),
// so `loader.js` — which declares top-level `const folderPath` — runs exactly
// once and never redeclares in global scope.
let bootedGameId: string | null = null;

type CheatEntry = { name: string; code: string };

export default function EmulatorPlayer({
  gameId,
  gameName,
  romUrl,
  loadStateUrl,
  cheats = [],
}: {
  gameId: string;
  gameName: string;
  romUrl: string;
  loadStateUrl: string | null;
  cheats?: CheatEntry[];
}) {
  useEffect(() => {
    // Same game already booted (StrictMode remount) → the loader is running; skip.
    if (bootedGameId === gameId) return;

    // A different game was booted in this JS context. EmulatorJS can't cleanly
    // re-initialise, so start from a fresh page load.
    if (bootedGameId && bootedGameId !== gameId) {
      window.location.reload();
      return;
    }

    bootedGameId = gameId;

    window.EJS_player = "#game";
    window.EJS_core = "gba";
    // Use the base locale (e.g. "en" not "en-US"): our vendored localization
    // ships base-language files only, so regional codes would 404.
    window.EJS_language = (navigator.language || "en").split(/[-_]/)[0];
    window.EJS_gameUrl = romUrl;
    window.EJS_gameID = numericId(gameId);
    window.EJS_gameName = gameName;
    window.EJS_pathtodata = "/emulatorjs/data/";
    window.EJS_startOnLoaded = true;
    if (loadStateUrl) window.EJS_loadStateURL = loadStateUrl;
    if (cheats.length > 0) {
      // EJS_cheats expects [[desc, code], ...] — each entry is a 2-element array.
      window.EJS_cheats = cheats.map((c) => [c.name, c.code]);
    }

    // Inject the loader exactly once. Do NOT remove it or delete the EJS_*
    // globals on cleanup — removing the <script> doesn't un-run it, and a second
    // injection re-executes loader.js → "folderPath already declared".
    if (!document.getElementById("ejs-loader")) {
      const script = document.createElement("script");
      script.id = "ejs-loader";
      script.src = "/emulatorjs/data/loader.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [gameId, gameName, romUrl, loadStateUrl]);

  // Stop the browser from scrolling the page when the player uses the D-pad /
  // Start (arrows, space, page/home/end). Without this, walking to a screen
  // edge scrolls the page down to the panels below the emulator. We only block
  // when focus is NOT in a form/interactive element, so typing a save label or
  // activating a button with Space still works.
  useEffect(() => {
    const SCROLL_KEYS = new Set([
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      " ",
      "PageUp",
      "PageDown",
      "Home",
      "End",
    ]);
    function onKeyDown(e: KeyboardEvent) {
      if (!SCROLL_KEYS.has(e.key)) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        tag === "A" ||
        el?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
    }
    // Capture phase: fire before EmulatorJS's own key handler (which stops
    // propagation), so preventDefault still cancels the page scroll while the
    // emulator keeps receiving the key.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <div className="w-full">
      <div className="crt-frame relative w-full overflow-hidden rounded-lg">
        <div style={{ width: "100%", aspectRatio: "3 / 2" }}>
          <div id="game" />
        </div>
      </div>
    </div>
  );
}
