# GBA ONLINE 🎮

Play Game Boy Advance Pokémon games (Emerald, FireRed, …) in your browser. Built
with **Next.js + EmulatorJS**, with per-user cloud save states on **AWS S3** and a
retro CRT/neon UI (Press Start 2P).

> ⚠️ **No ROMs are included.** Upload only GBA ROMs you legally own.

## Stack

- Next.js (App Router, TS) + Tailwind CSS v4
- Prisma 7 + PostgreSQL (via `@prisma/adapter-pg`)
- Auth.js v5 — email/password (credentials), JWT sessions
- AWS S3 (presigned PUT/GET) for ROMs + save states
- Self-hosted EmulatorJS (`public/emulatorjs/data`), mGBA core

## Setup

### 1. Install deps
```bash
npm install
```

### 2. Vendor EmulatorJS (self-hosted, gitignored)
```bash
bash scripts/fetch-emulatorjs.sh
```
Downloads the loader, built emulator, and the GBA (mGBA) core into
`public/emulatorjs/data`. Add more systems by dropping `<core>-wasm.data` into
`public/emulatorjs/data/cores/`.

### 3. Environment
```bash
cp .env.example .env
```
Fill in:
- `DATABASE_URL` — your PostgreSQL instance
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`

**S3 bucket CORS** (needed for browser presigned PUT/GET):
```json
[
  {
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 4. Database
```bash
npx prisma migrate dev   # creates tables (and the DB if missing)
npx prisma generate      # generates the client to generated/prisma
```

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000.

## How to play Pokémon Emerald

1. Sign up (creates your account) at `/signin`.
2. Click **+ Upload**, choose your `Pokemon Emerald.gba`, give it a title, upload.
3. You're redirected into the player — the game boots automatically.
4. Open the emulator menu (bottom bar) → **Save State**. The state (+ screenshot)
   is uploaded to S3, scoped to your account. Next time you open the game it
   auto-loads via `EJS_loadStateURL`.

## Architecture notes

- `lib/prisma.ts` — Prisma client singleton (pg driver adapter)
- `lib/s3.ts` — S3 client, `presignPut/presignGet`, key builders
- `auth.ts` — Auth.js config; `app/api/auth/[...nextauth]` handler
- `app/api/games` — list / create game (returns presigned ROM upload URL)
- `app/api/games/[id]/rom` — presigned ROM download URL
- `app/api/saves` — list user saves / upsert slot + presigned upload URLs
- `components/EmulatorPlayer.tsx` — sets `EJS_*` globals, injects `loader.js`,
  uploads save state via `EJS_onSaveState`
- `app/play/[gameId]` — presigns ROM + latest save, renders the player

## S3 layout

```
roms/{gameId}/{filename}.gba
saves/{userId}/{gameId}/{slot}.state
screenshots/{userId}/{gameId}/{slot}.png
```
