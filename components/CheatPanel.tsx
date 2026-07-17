"use client";

import { useState } from "react";

type Cheat = {
  name: string;
  code: string;
  description?: string;
};

export default function CheatPanel({ cheats }: { cheats: Cheat[] }) {
  const [enabled, setEnabled] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);

  if (cheats.length === 0) return null;

  function toggle(index: number) {
    const emulator = window.EJS_emulator;
    if (!emulator) {
      alert("Start the game first, then toggle cheats.");
      return;
    }

    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        emulator.disableCheat(index);
      } else {
        next.add(index);
        emulator.enableCheat(index);
      }
      return next;
    });
  }

  return (
    <div className="panel mt-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4"
      >
        <span className="pixel text-[10px] glow-cyan">CHEATS</span>
        <span className="pixel text-[10px] text-[var(--foreground)]">
          {enabled.size > 0 && (
            <span className="mr-3 text-[var(--neon-green)]">
              {enabled.size} ACTIVE
            </span>
          )}
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <ul className="border-t border-[var(--panel-border)] px-4 pb-4">
          {cheats.map((cheat, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-4 py-3 border-b border-[var(--panel-border)] last:border-0"
            >
              <div className="min-w-0">
                <p className="pixel text-[9px] leading-relaxed text-[var(--foreground)] truncate">
                  {cheat.name}
                </p>
                {cheat.description && (
                  <p className="mt-0.5 text-[10px] text-[var(--foreground)] opacity-50 truncate">
                    {cheat.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => toggle(i)}
                aria-pressed={enabled.has(i)}
                className={`relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
                  enabled.has(i)
                    ? "bg-[var(--neon-green)]"
                    : "bg-[var(--panel-border)]"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-black transition-transform duration-200 ${
                    enabled.has(i) ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
