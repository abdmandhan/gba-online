"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SLOTS = [0, 1, 2, 3, 4, 5];

type SaveEntry = {
  id: string;
  slot: number;
  label: string | null;
  updatedAt: string;
  stateUrl: string;
  screenshotUrl: string | null;
};

// Grab the live EmulatorJS instance, if it has booted far enough to save/load.
function readyEmulator() {
  const emu = window.EJS_emulator;
  if (emu?.gameManager?.supportsStates?.()) return emu;
  return null;
}

function relTime(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function SaveManager({
  gameId,
  gameSlug,
}: {
  gameId: string;
  gameSlug?: string;
}) {
  const fileBase = gameSlug ?? gameId;
  const [ready, setReady] = useState(false);
  const [saves, setSaves] = useState<SaveEntry[]>([]);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | null>(null);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((text: string) => {
    setMsg(text);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setMsg(null), 2500);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/saves?gameId=${encodeURIComponent(gameId)}`,
      );
      if (!res.ok) return;
      const { saves: list } = await res.json();
      setSaves(list ?? []);
    } catch {
      // Non-fatal: leave the current list in place.
    }
  }, [gameId]);

  // Poll until the emulator core is ready, then load the saved-slot list.
  useEffect(() => {
    let done = false;
    const timer = setInterval(() => {
      if (readyEmulator()) {
        if (!done) {
          done = true;
          setReady(true);
          refresh();
        }
        clearInterval(timer);
      }
    }, 500);
    return () => {
      clearInterval(timer);
      if (msgTimer.current) clearTimeout(msgTimer.current);
    };
  }, [refresh]);

  const bySlot = new Map(saves.map((s) => [s.slot, s]));

  // Latest values the (mount-once) key listener needs, refreshed every render so
  // it never reads stale closures without re-binding the listener.
  const kbRef = useRef<{
    ready: boolean;
    busySlot: number | null;
    pendingSlot: number | null;
    save: (slot: number) => void;
  }>({ ready: false, busySlot: null, pendingSlot: null, save: () => {} });
  useEffect(() => {
    kbRef.current = { ready, busySlot, pendingSlot, save };
  });

  // Keyboard shortcuts: 1–6 → slots 0–5. Pressing a digit opens the confirm
  // dialog for that slot; Enter/Escape confirm/cancel while it's open. Capture
  // phase + stopImmediatePropagation so keys we consume (esp. Enter = GBA Start)
  // never reach EmulatorJS.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
      const { ready: r, busySlot: b, pendingSlot: p, save: doSave } =
        kbRef.current;
      const isSlotKey = /^[1-6]$/.test(e.key);

      if (p === null) {
        if (isSlotKey && r && b === null) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setPendingSlot(Number(e.key) - 1);
        }
        return;
      }

      // Dialog open.
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (b === null) {
          setPendingSlot(null);
          doSave(p);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        setPendingSlot(null);
      } else if (isSlotKey) {
        // Swallow digits so they don't reach the game while confirming.
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  async function save(slot: number) {
    const emu = readyEmulator();
    if (!emu || busySlot !== null) return;
    setBusySlot(slot);
    try {
      // Replicate the emulator's own Save State button: read state bytes, then
      // grab a screenshot. (getState is synchronous; it throws if state isn't
      // ready.) We read `.blob`, not `.screenshot`, which is undefined in this
      // EmulatorJS build.
      const state: Uint8Array = emu.gameManager.getState();
      let screenshot: Blob | null = null;
      try {
        const shot = await emu.takeScreenshot(
          emu.capture.photo.source,
          emu.capture.photo.format,
          emu.capture.photo.upscale,
        );
        screenshot = shot?.blob ?? null;
      } catch {
        screenshot = null; // Save the state even if the screenshot fails.
      }

      const res = await fetch("/api/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, slot, hasScreenshot: !!screenshot }),
      });
      if (!res.ok) throw new Error("register");
      const { stateUploadUrl, screenshotUploadUrl } = await res.json();

      await fetch(stateUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Blob([new Uint8Array(state)]),
      });
      if (screenshot && screenshotUploadUrl) {
        await fetch(screenshotUploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/png" },
          body: screenshot,
        });
      }
      await refresh();
      flash(`SLOT ${slot} SAVED ✔`);
    } catch {
      flash(`SLOT ${slot} SAVE FAILED ✕`);
    } finally {
      setBusySlot(null);
    }
  }

  async function download(slot: number) {
    const entry = bySlot.get(slot);
    if (!entry) return;
    try {
      const res = await fetch(entry.stateUrl); // presigned GET, same as load()
      if (!res.ok) throw new Error("download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase}-slot${slot}.state`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash(`SLOT ${slot} DOWNLOADED ✔`);
    } catch {
      flash(`SLOT ${slot} DOWNLOAD FAILED ✕`);
    }
  }

  async function load(slot: number) {
    const emu = readyEmulator();
    const entry = bySlot.get(slot);
    if (!emu || !entry || busySlot !== null) return;
    setBusySlot(slot);
    try {
      const res = await fetch(entry.stateUrl);
      if (!res.ok) throw new Error("download");
      const bytes = new Uint8Array(await res.arrayBuffer());
      emu.gameManager.loadState(bytes);
      flash(`SLOT ${slot} LOADED ✔`);
    } catch {
      flash(`SLOT ${slot} LOAD FAILED ✕`);
    } finally {
      setBusySlot(null);
    }
  }

  return (
    <div className="panel mt-6 p-4">
      <div className="flex items-center justify-between">
        <p className="pixel text-[10px] glow-cyan">SAVE SLOTS</p>
        {msg && (
          <p className="pixel text-[10px] text-[var(--neon-green)]">{msg}</p>
        )}
      </div>

      {!ready && (
        <p className="mt-3 text-base text-[var(--foreground)]">
          Waiting for the emulator to boot…
        </p>
      )}

      {ready && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SLOTS.map((slot) => {
            const entry = bySlot.get(slot);
            const busy = busySlot === slot;
            return (
              <div
                key={slot}
                className="flex flex-col gap-2 border-2 border-[var(--panel-border)] p-2"
              >
                <div className="flex items-center justify-between">
                  <span className="pixel text-[9px] glow-green">
                    SLOT {slot}
                  </span>
                  {entry && (
                    <span className="text-sm text-[var(--neon-cyan)]">
                      {relTime(entry.updatedAt)}
                    </span>
                  )}
                </div>

                <div className="aspect-[3/2] w-full overflow-hidden bg-black">
                  {entry?.screenshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.screenshotUrl}
                      alt={`Slot ${slot} preview`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--panel-border)]">
                      EMPTY
                    </div>
                  )}
                </div>

                {entry ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => load(slot)}
                        disabled={busySlot !== null}
                        className="btn-arcade btn-cyan flex-1 !px-2 !py-2 !text-[9px]"
                      >
                        {busy ? "…" : "Load"}
                      </button>
                      <button
                        type="button"
                        onClick={() => save(slot)}
                        disabled={busySlot !== null}
                        className="btn-arcade flex-1 !px-2 !py-2 !text-[9px]"
                      >
                        {busy ? "…" : "Overwrite"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => download(slot)}
                      disabled={busySlot !== null}
                      className="btn-arcade btn-magenta w-full !px-2 !py-2 !text-[9px]"
                    >
                      Download
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => save(slot)}
                    disabled={busySlot !== null}
                    className="btn-arcade w-full !px-2 !py-2 !text-[9px]"
                  >
                    {busy ? "…" : "Save here"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pendingSlot !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPendingSlot(null)}
        >
          <div
            className="panel w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="pixel text-[11px] glow-cyan">
              SAVE TO SLOT {pendingSlot}
            </p>
            {(() => {
              const existing = bySlot.get(pendingSlot);
              return existing ? (
                <p className="mt-3 text-base text-[var(--neon-magenta)]">
                  Overwrite existing save
                  {existing.label ? ` “${existing.label}”` : ""} ·{" "}
                  {relTime(existing.updatedAt)}
                </p>
              ) : (
                <p className="mt-3 text-base text-[var(--foreground)]">
                  Empty slot — save here?
                </p>
              );
            })()}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const slot = pendingSlot;
                  setPendingSlot(null);
                  save(slot);
                }}
                disabled={busySlot !== null}
                className="btn-arcade flex-1"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setPendingSlot(null)}
                className="btn-arcade btn-cyan flex-1"
              >
                Cancel
              </button>
            </div>
            <p className="mt-3 text-center text-sm text-[var(--neon-cyan)]">
              Press Enter to confirm · Esc to cancel
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
