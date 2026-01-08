
process.env.JWT_SECRET = "test-secret-key-123";
// Use existing DATABASE_URL if set (e.g., in CI), otherwise fallback to local dev port
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5434/email_service_test";
process.env.NODE_ENV = "test";
process.env.REQUIRE_EMAIL_VERIFICATION = "false";
// Add dummy Stripe keys for tests
process.env.STRIPE_API_KEY = process.env.STRIPE_API_KEY || "sk_test_dummy_key_for_testing_only";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_dummy_secret";
