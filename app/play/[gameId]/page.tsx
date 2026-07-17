import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fileUrl, presignGet } from "@/lib/s3";
import SiteHeader from "@/components/SiteHeader";
import EmulatorPlayer from "@/components/EmulatorPlayer";
import SaveManager from "@/components/SaveManager";

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

  const romUrl = await fileUrl(game.romKey);

  // Auto-load the user's most-recently-updated save-state on boot, if present.
  const latestSave = await prisma.saveState.findFirst({
    where: { userId: session.user.id, gameId },
    orderBy: { updatedAt: "desc" },
  });
  // Presigned S3 GET (not the stable CloudFront path) so an overwritten save
  // auto-loads fresh bytes instead of CDN/browser-cached ones.
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

        <SaveManager gameId={game.id} />

        <div className="panel mt-6 p-4 text-base leading-relaxed text-[var(--foreground)]">
          <p className="pixel text-[10px] glow-cyan">CONTROLS</p>
          <p className="mt-3">
            Use the on-screen menu (bottom bar) to configure controls. Default
            keyboard: arrows = D-pad, Z/X = A/B, Enter = Start, Shift = Select.
          </p>
          <p className="mt-2 text-[var(--neon-green)]">
            Use the SAVE SLOTS panel above to store progress to the cloud in any
            slot and load it back anytime. Your most recent save auto-loads next
            time you open this game.
          </p>
        </div>
      </main>
    </>
  );
}
