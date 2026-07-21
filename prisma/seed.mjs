import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";

// Seed the Cheat table from data/cheats/*.json. Each file's basename is the
// game slug (pokemon-emerald.json -> "pokemon-emerald"). Idempotent: upsert on
// (gameSlug, name). Uses raw pg (not the generated Prisma client, which is TS)
// so it runs under plain node. Run with `npm run seed`.

const here = dirname(fileURLToPath(import.meta.url));
const cheatsDir = join(here, "..", "data", "cheats");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const UPSERT = `
  INSERT INTO "Cheat" ("id", "gameSlug", "category", "name", "code", "description", "sortOrder")
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  ON CONFLICT ("gameSlug", "name") DO UPDATE SET
    "category" = EXCLUDED."category",
    "code" = EXCLUDED."code",
    "description" = EXCLUDED."description",
    "sortOrder" = EXCLUDED."sortOrder"
`;

async function main() {
  const files = readdirSync(cheatsDir).filter((f) => f.endsWith(".json"));
  let total = 0;

  for (const file of files) {
    const gameSlug = file.replace(/\.json$/, "");
    const entries = JSON.parse(readFileSync(join(cheatsDir, file), "utf8"));

    for (let i = 0; i < entries.length; i++) {
      const c = entries[i];
      await pool.query(UPSERT, [
        randomUUID(),
        gameSlug,
        c.category,
        c.name,
        c.code,
        c.description ?? null,
        i,
      ]);
      total++;
    }
    console.log(`  ${gameSlug}: ${entries.length} cheats`);
  }

  console.log(`Seeded ${total} cheats across ${files.length} game(s).`);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
