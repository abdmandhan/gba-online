import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { presignGet, presignPut, s3keys, S3_BUCKET } from "@/lib/s3";

// GET /api/saves?gameId=... — list the current user's save states for a game,
// each with presigned download URLs for the state + screenshot. Save-state keys
// are stable per slot, so we use presigned S3 GETs (unique signed URL each time,
// hitting the S3 origin) rather than the stable CloudFront path — otherwise an
// overwritten slot would serve the CDN/browser-cached old bytes.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gameId = new URL(request.url).searchParams.get("gameId");
  if (!gameId) {
    return NextResponse.json({ error: "gameId is required" }, { status: 400 });
  }

  const saves = await prisma.saveState.findMany({
    where: { userId: session.user.id, gameId },
    orderBy: [{ slot: "asc" }],
  });

  const withUrls = await Promise.all(
    saves.map(async (s) => ({
      id: s.id,
      slot: s.slot,
      label: s.label,
      updatedAt: s.updatedAt,
      stateUrl: await presignGet(s.stateKey),
      screenshotUrl: s.screenshotKey ? await presignGet(s.screenshotKey) : null,
    })),
  );

  return NextResponse.json({ saves: withUrls });
}

// POST /api/saves — upsert a save-state slot and return presigned PUT URLs so the
// client can upload the state bytes (+ optional screenshot) directly to S3.
// Body: { gameId: string, slot?: number, label?: string, hasScreenshot?: boolean }
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

  const body = await request.json().catch(() => ({}));
  const gameId: string | undefined = body.gameId;
  const slot = Number.isInteger(body.slot) ? body.slot : 0;
  const label: string | null = body.label ?? null;
  const hasScreenshot: boolean = !!body.hasScreenshot;

  if (!gameId) {
    return NextResponse.json({ error: "gameId is required" }, { status: 400 });
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const userId = session.user.id;
  const stateKey = s3keys.save(userId, gameId, slot);
  const screenshotKey = hasScreenshot
    ? s3keys.screenshot(userId, gameId, slot)
    : null;

  await prisma.saveState.upsert({
    where: { userId_gameId_slot: { userId, gameId, slot } },
    create: { userId, gameId, slot, stateKey, screenshotKey, label },
    update: { stateKey, screenshotKey, label },
  });

  const stateUploadUrl = await presignPut(stateKey, "application/octet-stream");
  const screenshotUploadUrl = screenshotKey
    ? await presignPut(screenshotKey, "image/png")
    : null;

  return NextResponse.json({ stateUploadUrl, screenshotUploadUrl });
}
