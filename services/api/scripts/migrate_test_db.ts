
import { execSync } from 'child_process';

// DATABASE_URL must be set explicitly — no fallback with embedded credentials.
// For local dev use: export DATABASE_URL=postgresql://postgres:<password>@localhost:5434/email_service_test
const TEST_DB_URL = process.env.DATABASE_URL;
if (!TEST_DB_URL) {
    console.error("Error: required environment variable 'DATABASE_URL' is not set.");
    process.exit(1);
}

console.log(`Migrating test database at ${TEST_DB_URL}...`);

// Set the environment variable for this process
process.env.DATABASE_URL = TEST_DB_URL;

try {
    // Run prisma db push
    execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: TEST_DB_URL }
    });
    console.log("Migration completed successfully.");
} catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
}
