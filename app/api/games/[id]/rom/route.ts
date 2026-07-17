import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fileUrl } from "@/lib/s3";

// GET /api/games/[id]/rom — presigned download URL for the game's ROM (auth-gated).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const game = await prisma.game.findUnique({ where: { id } });
  if (!game || !game.romKey) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const url = await fileUrl(game.romKey);
  return NextResponse.json({ url });
}
