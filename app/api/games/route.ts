import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignPut, s3keys, S3_BUCKET } from "@/lib/s3";
import { slugify } from "@/lib/slug";

// GET /api/games — list all games in the shared library.
export async function GET() {
  const games = await prisma.game.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      core: true,
      coverUrl: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ games });
}

// POST /api/games — create game metadata + return a presigned PUT URL for the ROM.
// Body: { title: string, filename: string, contentType?: string }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!S3_BUCKET) {
    return NextResponse.json(
      { error: "S3 is not configured (set S3_BUCKET + AWS credentials)." },
      { status: 500 },
    );
  }

  const { title, filename, contentType } = await request
    .json()
    .catch(() => ({}));

  if (!title || !filename || typeof title !== "string" || typeof filename !== "string") {
    return NextResponse.json(
      { error: "title and filename are required." },
      { status: 400 },
    );
  }

  // Ensure unique slug.
  const base = slugify(title) || "game";
  let slug = base;
  for (let i = 2; await prisma.game.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  // Create first to get an id, then derive the ROM key and persist it.
  const game = await prisma.game.create({
    data: {
      title,
      slug,
      core: "gba",
      romKey: "", // set below
      uploadedById: session.user.id,
    },
  });

  const romKey = s3keys.rom(game.id, filename);
  await prisma.game.update({ where: { id: game.id }, data: { romKey } });

  const uploadUrl = await presignPut(
    romKey,
    contentType || "application/octet-stream",
  );

  return NextResponse.json(
    { game: { id: game.id, title: game.title, slug: game.slug }, uploadUrl },
    { status: 201 },
  );
}
