"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadRomForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f && !title) {
      setTitle(f.name.replace(/\.(gba|zip)$/i, "").replace(/[_-]+/g, " "));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      setProgress("Registering game…");
      const createRes = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || file.name,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create game");
      }
      const { game, uploadUrl } = await createRes.json();

      setProgress("Uploading ROM to S3…");
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload to S3 failed");

      setProgress("Done! Booting…");
      router.push(`/play/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel mt-8 flex flex-col gap-5 p-6">
      <label className="block">
        <span className="pixel text-[10px] text-[var(--neon-cyan)]">
          ROM FILE (.gba)
        </span>
        <input
          type="file"
          accept=".gba,.zip,application/octet-stream"
          onChange={onPickFile}
          required
          className="input-retro mt-2 file:mr-3 file:border-0 file:bg-[var(--neon-cyan)] file:px-3 file:py-1 file:text-[#0a0410]"
        />
      </label>

      <label className="block">
        <span className="pixel text-[10px] text-[var(--neon-cyan)]">TITLE</span>
        <input
          className="input-retro mt-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Pokémon Emerald"
          required
        />
      </label>

      {progress && (
        <p className="text-lg text-[var(--neon-green)]">{progress}</p>
      )}
      {error && (
        <p className="pixel text-[10px] leading-relaxed glow-magenta">
          {error}
        </p>
      )}

      <button type="submit" className="btn-arcade" disabled={busy || !file}>
        {busy ? "Uploading…" : "▶ Upload & Play"}
      </button>
    </form>
  );
}
