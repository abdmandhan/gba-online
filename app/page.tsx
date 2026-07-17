import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/components/SiteHeader";
import GameCard from "@/components/GameCard";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  const games = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
    where: session?.user?.id
      ? {
          OR: [
            { archivedAt: null },
            { uploadedById: session.user.id },
          ],
        }
      : { archivedAt: null },
    select: {
      id: true,
      title: true,
      core: true,
      coverUrl: true,
      uploadedById: true,
      archivedAt: true,
    },
  });

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
      </main>

      <footer className="border-t-2 border-[var(--panel-border)] px-4 py-5 text-center text-base text-[var(--panel-border)]">
        Powered by EmulatorJS · Bring your own ROMs
      </footer>
    </>
  );
}
