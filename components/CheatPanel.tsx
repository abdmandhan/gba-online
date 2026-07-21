"use client";

import { useState } from "react";

type Cheat = {
  name: string;
  code: string;
  description?: string | null;
  category: string;
};

export default function CheatPanel({ cheats }: { cheats: Cheat[] }) {
  const [enabled, setEnabled] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  function toggleCat(category: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  if (cheats.length === 0) return null;

  // Sync the core to a desired enabled-set. Nothing is preloaded, so we keep
  // `emulator.cheats` holding ONLY the active cheats (non-permanent). The mGBA
  // core has no real per-cheat disable, so on every change we wipe it with
  // resetCheat() and reapply just the active list.
  function applyEnabled(next: Set<number>) {
    const emulator = window.EJS_emulator;
    if (!emulator?.gameManager) return;
    emulator.gameManager.resetCheat();
    const active = [...next].sort((a, b) => a - b);
    // eslint-disable-next-line react-hooks/immutability -- external EmulatorJS object, not React state
    emulator.cheats = active.map((i) => ({
      desc: cheats[i].name,
      code: cheats[i].code,
      checked: true,
    }));
    emulator.cheats.forEach((c: { code: string }, idx: number) =>
      emulator.cheatChanged(true, c.code, idx),
    );
  }

  function toggle(index: number) {
    const emulator = window.EJS_emulator;
    if (!emulator?.gameManager) {
      alert("Start the game first, then toggle cheats.");
      return;
    }
    const next = new Set(enabled);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    applyEnabled(next); // wipe + reapply → disabling one genuinely removes it
    setEnabled(next);
  }

  function reset() {
    applyEnabled(new Set()); // resetCheat() + reapply nothing = all cleared
    setEnabled(new Set());
  }

  // Group by category for display, preserving each cheat's original flat index
  // (toggle/applyEnabled operate on that index). Map keeps first-seen order,
  // which matches the query's sortOrder.
  const groups: { category: string; items: { cheat: Cheat; index: number }[] }[] =
    [];
  const byCategory = new Map<string, { cheat: Cheat; index: number }[]>();
  cheats.forEach((cheat, index) => {
    let items = byCategory.get(cheat.category);
    if (!items) {
      items = [];
      byCategory.set(cheat.category, items);
      groups.push({ category: cheat.category, items });
    }
    items.push({ cheat, index });
  });

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
        <>
          <div className="flex justify-end border-t border-[var(--panel-border)] px-4 pt-3">
            <button
              type="button"
              onClick={reset}
              disabled={enabled.size === 0}
              className="btn-arcade btn-magenta !px-3 !py-2 !text-[9px]"
            >
              Reset cheats
            </button>
          </div>
          <div className="px-4 pb-4">
            {groups.map((group) => {
              const isOpen = openCats.has(group.category);
              const activeCount = group.items.filter(({ index }) =>
                enabled.has(index),
              ).length;
              return (
                <section
                  key={group.category}
                  className="border-t border-[var(--panel-border)] first:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleCat(group.category)}
                    className="flex w-full items-center justify-between py-3"
                  >
                    <span className="pixel text-[9px] glow-green">
                      {group.category}
                    </span>
                    <span className="pixel text-[9px] text-[var(--foreground)]">
                      {activeCount > 0 && (
                        <span className="mr-3 text-[var(--neon-green)]">
                          {activeCount}/{group.items.length}
                        </span>
                      )}
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="pb-2">
                      {group.items.map(({ cheat, index }) => (
                    <li
                      key={index}
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
                        onClick={() => toggle(index)}
                        aria-pressed={enabled.has(index)}
                        className={`relative shrink-0 h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
                          enabled.has(index)
                            ? "bg-[var(--neon-green)]"
                            : "bg-[var(--panel-border)]"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-black transition-transform duration-200 ${
                            enabled.has(index) ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
