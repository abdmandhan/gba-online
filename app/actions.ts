"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function doSignOut() {
  await signOut({ redirectTo: "/signin" });
}

export async function toggleArchive(gameId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { uploadedById: true, archivedAt: true },
  });
  if (!game) throw new Error("Game not found");
  if (game.uploadedById !== session.user.id) throw new Error("Forbidden");

  await prisma.game.update({
    where: { id: gameId },
    data: { archivedAt: game.archivedAt ? null : new Date() },
  });

  revalidatePath("/");
}
