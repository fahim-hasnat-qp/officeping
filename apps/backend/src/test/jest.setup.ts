// Default test environment — override with DATABASE_URL env var when running
// against a real DB (e.g. via docker-compose -f docker-compose.test.yml).
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:test@localhost:5498/officeping_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_EXPIRY = '1h';
process.env.DEMO_MODE = 'true';
process.env.ALLOWED_EMAIL_DOMAIN = 'officeping.test';
process.env.ADMIN_EMAILS = 'admin@officeping.test';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'test-client-id';
