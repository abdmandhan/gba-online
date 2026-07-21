-- CreateTable
CREATE TABLE "Cheat" (
    "id" TEXT NOT NULL,
    "gameSlug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cheat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cheat_gameSlug_idx" ON "Cheat"("gameSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Cheat_gameSlug_name_key" ON "Cheat"("gameSlug", "name");
