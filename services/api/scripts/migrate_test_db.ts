
import { execSync } from 'child_process';

const TEST_DB_URL = "postgresql://postgres:postgres@localhost:5434/email_service_test";

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
