import { config as loadEnv } from "dotenv";
import path from "path";

// Load .env if present but do not override existing values
loadEnv({ path: ".env", override: false });

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-secret";
}

const testDb = process.env.TEST_DATABASE_URL;
if (testDb) {
  process.env.DATABASE_URL = testDb;
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/email_service";
}

if (!process.env.STORAGE_DIR) {
  process.env.STORAGE_DIR = path.join(process.cwd(), "tmp-storage-test");
}

process.env.REDIS_PORT = "6380";
process.env.REDIS_HOST = "localhost";
