"use client";

import { useEffect, useRef, useState } from "react";

type SaveStatePayload = {
  state?: Uint8Array;
  screenshot?: Uint8Array;
  format?: string;
};

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

const EJS_KEYS = [
  "EJS_player",
  "EJS_core",
  "EJS_gameUrl",
  "EJS_gameID",
  "EJS_gameName",
  "EJS_pathtodata",
  "EJS_startOnLoaded",
  "EJS_loadStateURL",
  "EJS_onSaveState",
  "EJS_ready",
  "EJS_onGameStart",
  "EJS_emulator",
  "EJS_Buttons",
];

export default function EmulatorPlayer({
  gameId,
  gameName,
  romUrl,
  loadStateUrl,
}: {
  gameId: string;
  gameName: string;
  romUrl: string;
  loadStateUrl: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function uploadSaveState({ state, screenshot }: SaveStatePayload) {
      try {
        if (!state) return;
        const hasScreenshot = !!(screenshot && screenshot.length);
        const res = await fetch("/api/saves", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId, slot: 0, hasScreenshot }),
        });
        if (!res.ok) throw new Error("Failed to register save slot");
        const { stateUploadUrl, screenshotUploadUrl } = await res.json();

        await fetch(stateUploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: new Blob([new Uint8Array(state)]),
        });
        if (hasScreenshot && screenshotUploadUrl) {
          await fetch(screenshotUploadUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/png" },
            body: new Blob([new Uint8Array(screenshot!)], { type: "image/png" }),
          });
        }
        setSaveMsg("SAVED TO CLOUD ✔");
      } catch {
        setSaveMsg("SAVE FAILED ✕");
      }
      setTimeout(() => setSaveMsg(null), 2500);
    }

    window.EJS_player = "#game";
    window.EJS_core = "gba";
    window.EJS_gameUrl = romUrl;
    window.EJS_gameID = numericId(gameId);
    window.EJS_gameName = gameName;
    window.EJS_pathtodata = "/emulatorjs/data/";
    window.EJS_startOnLoaded = true;
    window.EJS_onSaveState = uploadSaveState;
    if (loadStateUrl) window.EJS_loadStateURL = loadStateUrl;

    const script = document.createElement("script");
    script.src = "/emulatorjs/data/loader.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
      for (const k of EJS_KEYS) delete window[k];
      startedRef.current = false;
    };
  }, [gameId, gameName, romUrl, loadStateUrl]);

  return (
    <div className="w-full">
      <div className="crt-frame relative w-full overflow-hidden rounded-lg">
        <div style={{ width: "100%", aspectRatio: "3 / 2" }}>
          <div id="game" ref={containerRef} />
        </div>
      </div>
      {saveMsg && (
        <p className="mt-3 text-center text-[10px] text-[var(--neon-green)]">
          {saveMsg}
        </p>
      )}
    </div>
  );
}
