import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignGet } from "@/lib/s3";
import SiteHeader from "@/components/SiteHeader";
import EmulatorPlayer from "@/components/EmulatorPlayer";

export const dynamic = "force-dynamic";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { gameId } = await params;
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || !game.romKey) notFound();

  const romUrl = await presignGet(game.romKey);

  // Auto-load the user's latest save-state (slot 0) on boot, if present.
  const latestSave = await prisma.saveState.findUnique({
    where: {
      userId_gameId_slot: { userId: session.user.id, gameId, slot: 0 },
    },
  });
  const loadStateUrl = latestSave
    ? await presignGet(latestSave.stateKey)
    : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="pixel text-sm leading-relaxed glow-green">
            {game.title}
          </h1>
          <Link href="/" className="btn-arcade btn-cyan no-underline">
            ← Library
          </Link>
        </div>

        <EmulatorPlayer
          gameId={game.id}
          gameName={game.title}
          romUrl={romUrl}
          loadStateUrl={loadStateUrl}
        />

        <div className="panel mt-6 p-4 text-base leading-relaxed text-[var(--foreground)]">
          <p className="pixel text-[10px] glow-cyan">CONTROLS</p>
          <p className="mt-3">
            Use the on-screen menu (bottom bar) to configure controls. Default
            keyboard: arrows = D-pad, Z/X = A/B, Enter = Start, Shift = Select.
          </p>
          <p className="mt-2 text-[var(--neon-green)]">
            Open the emulator menu → Save State to store progress in the cloud.
            It auto-loads next time you open this game.
          </p>
        </div>
      </main>
    </>
  );
}
