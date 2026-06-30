/**
 * Shared constants for the seeded test fixtures.
 *
 * Lives in its own file (no side effects, no `import.meta`) so the
 * Playwright test suite can import these constants without pulling in
 * `scripts/seed-test-user.ts` — which uses `import.meta.url` for its
 * CLI guard and therefore cannot be bundled by Playwright's CJS-only
 * loader. The seed file re-exports the same values for back-compat.
 */
export const TEST_USER_EMAIL = "test@test.no"
export const TEST_USER_PASSWORD = "test123"
export const TEST_WINE_NAME = "Testvin"
export const TEST_WINE_PRODUCER = "Testprodusent"
