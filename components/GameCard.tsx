import Link from "next/link";

export type GameCardData = {
  id: string;
  title: string;
  core: string;
  coverUrl: string | null;
};

export default function GameCard({ game }: { game: GameCardData }) {
  return (
    <Link
      href={`/play/${game.id}`}
      className="panel group flex flex-col overflow-hidden no-underline transition-transform hover:-translate-y-1"
    >
      <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[#0d0620]">
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
      </div>
      <div className="border-t-2 border-[var(--panel-border)] p-3">
        <p className="pixel text-[10px] leading-relaxed text-[var(--foreground)]">
          {game.title}
        </p>
        <p className="mt-1 text-sm uppercase text-[var(--neon-cyan)]">
          {game.core}
        </p>
      </div>
    </Link>
  );
}
