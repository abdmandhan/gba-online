"use client";

import { useTransition } from "react";
import { toggleArchive } from "@/app/actions";

export default function ArchiveButton({
  gameId,
  isArchived,
}: {
  gameId: string;
  isArchived: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => toggleArchive(gameId))}
      disabled={isPending}
      className={`btn-arcade mt-2 w-full text-[9px] ${isArchived ? "" : "btn-magenta"}`}
    >
      {isPending ? "..." : isArchived ? "UNARCHIVE" : "ARCHIVE"}
    </button>
  );
}
