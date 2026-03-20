import { config } from "dotenv";
import { resolve } from "path";

// Load .env.test for local test runs; CI sets DATABASE_URL via environment
config({ path: resolve(__dirname, "../../../.env.test"), override: true });
