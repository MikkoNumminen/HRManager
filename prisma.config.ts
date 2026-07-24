import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // No `directUrl` here: Prisma 7's Datasource config accepts `url` and
  // `shadowDatabaseUrl` only — the key appears nowhere in prisma@7.5.0 or
  // @prisma/config@7.5.0, so it was silently ignored. All it still did was make
  // `env("DIRECT_URL")` throw wherever that variable is unset, which killed
  // every Vercel preview build inside `postinstall`'s `prisma generate`
  // (DIRECT_URL is scoped to the Production environment there).
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
  },
});
