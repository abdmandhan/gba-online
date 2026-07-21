import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/SiteHeader";
import GameCard from "@/components/GameCard";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const GAME_CARD_SELECT = {
  id: true,
  title: true,
  core: true,
  coverUrl: true,
  uploadedById: true,
  archivedAt: true,
} as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const session = await auth();
  const showArchived = (await searchParams).archived === "1";

  // Archived games are hidden from every list by default.
  const games = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
    where: { archivedAt: null },
    select: GAME_CARD_SELECT,
  });

  // Owner-only: their archived games, revealed by the "Show archived" toggle.
  const archivedGames =
    showArchived && session?.user?.id
      ? await prisma.game.findMany({
          orderBy: { createdAt: "desc" },
          where: { archivedAt: { not: null }, uploadedById: session.user.id },
          select: GAME_CARD_SELECT,
        })
      : [];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <section className="mb-10 text-center">
          <h1 className="pixel text-2xl leading-relaxed glow-green sm:text-4xl">
            GBA ONLINE
          </h1>
          <p className="mt-4 text-xl text-[var(--neon-cyan)]">
            Play GBA Pokémon in your browser<span className="blink">_</span>
          </p>
        </section>

        {session?.user && (
          <div className="mb-6 flex justify-end">
            <Link
              href={showArchived ? "/" : "/?archived=1"}
              className="btn-arcade btn-cyan no-underline !px-3 !py-2 !text-[9px]"
            >
              {showArchived ? "Hide archived" : "Show archived"}
            </Link>
          </div>
        )}

        {games.length === 0 ? (
          <div className="panel mx-auto max-w-xl p-8 text-center">
            <p className="pixel text-[11px] leading-relaxed glow-magenta">
              NO CARTRIDGES INSERTED
            </p>
            <p className="mt-5 text-lg text-[var(--foreground)]">
              Upload a GBA ROM you own (e.g. Pokémon Emerald) to start playing.
            </p>
            <div className="mt-6">
              {session?.user ? (
                <Link href="/upload" className="btn-arcade no-underline">
                  + Upload a ROM
                </Link>
              ) : (
                <Link href="/signin" className="btn-arcade no-underline">
                  Sign in to upload
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isOwner={
                  !!session?.user?.id &&
                  game.uploadedById === session.user.id
                }
              />
            ))}
          </div>
        )}

        {archivedGames.length > 0 && (
          <section className="mt-12">
            <p className="pixel text-[11px] glow-magenta">ARCHIVED</p>
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {archivedGames.map((game) => (
                <GameCard key={game.id} game={game} isOwner />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t-2 border-[var(--panel-border)] px-4 py-5 text-center text-base text-[var(--panel-border)]">
        Powered by EmulatorJS · Bring your own ROMs
      </footer>
    </>
  );
}
