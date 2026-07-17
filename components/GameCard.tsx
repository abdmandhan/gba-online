import Link from "next/link";
import ArchiveButton from "@/components/ArchiveButton";

export type GameCardData = {
  id: string;
  title: string;
  core: string;
  coverUrl: string | null;
  uploadedById: string | null;
  archivedAt: Date | null;
};

export default function GameCard({
  game,
  isOwner,
}: {
  game: GameCardData;
  isOwner?: boolean;
}) {
  return (
    <div className="panel group flex flex-col overflow-hidden transition-transform hover:-translate-y-1">
      <Link
        href={`/play/${game.id}`}
        className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[#0d0620] no-underline"
      >
        {game.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.coverUrl}
            alt={game.title}
            className="h-full w-full object-cover [image-rendering:pixelated]"
          />
        ) : (
          <span className="pixel text-3xl glow-magenta opacity-80">GBA</span>
        )}
        <span className="absolute inset-x-0 bottom-0 translate-y-full bg-[var(--neon-green)] py-2 text-center pixel text-[10px] text-[#0a0410] transition-transform group-hover:translate-y-0">
          ▶ PLAY
        </span>
      </Link>

      <div className="border-t-2 border-[var(--panel-border)] p-3">
        <Link href={`/play/${game.id}`} className="no-underline">
          <p className="pixel text-[10px] leading-relaxed text-[var(--foreground)]">
            {game.title}
          </p>
          <p className="mt-1 text-sm uppercase text-[var(--neon-cyan)]">
            {game.core}
          </p>
        </Link>

        {isOwner && (
          <ArchiveButton gameId={game.id} isArchived={!!game.archivedAt} />
        )}
      </div>
    </div>
  );
}
