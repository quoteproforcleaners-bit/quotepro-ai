/**
 * Smoke test: verify key API routes respond before running the full e2e suite.
 *
 * This script makes a small number of HTTP calls to critical endpoints and
 * fails fast (non-zero exit) with a clear message if any of them are broken.
 * It is intended to run between the "wait for server to be healthy" step and
 * the Playwright e2e tests in CI.
 *
 * A route is considered healthy if it returns one of its expected status
 * codes. Unauthenticated endpoints are expected to return 401 — that still
 * proves the router is wired up and responding.
 */

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:5000";
const TIMEOUT_MS = 10_000;

type SmokeCheck = {
  name: string;
  path: string;
  method?: "GET" | "POST";
  expectedStatuses: number[];
};

const checks: SmokeCheck[] = [
  {
    name: "health",
    path: "/api/health",
    expectedStatuses: [200],
  },
  {
    name: "auth session (unauthenticated)",
    path: "/api/auth/me",
    expectedStatuses: [200, 401],
  },
  {
    name: "quotes list (unauthenticated)",
    path: "/api/quotes",
    expectedStatuses: [200, 401],
  },
];

async function runCheck(check: SmokeCheck): Promise<string | null> {
  const url = `${BASE_URL}${check.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: check.method ?? "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const body = await response.text();

    if (!check.expectedStatuses.includes(response.status)) {
      return [
        `FAIL  ${check.name}`,
        `  URL:      ${url}`,
        `  Status:   ${response.status} (expected one of: ${check.expectedStatuses.join(", ")})`,
        `  Body:     ${truncate(body, 500)}`,
      ].join("\n");
    }

    console.log(`PASS  ${check.name.padEnd(36)} ${response.status} ${url}`);
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return [
      `FAIL  ${check.name}`,
      `  URL:      ${url}`,
      `  Error:    ${message}`,
    ].join("\n");
  } finally {
    clearTimeout(timer);
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}... (${value.length - max} more chars)`;
}

async function main() {
  console.log(`Running smoke tests against ${BASE_URL}`);
  const failures: string[] = [];

  for (const check of checks) {
    const failure = await runCheck(check);
    if (failure) failures.push(failure);
  }

  if (failures.length > 0) {
    console.error("\nSmoke tests failed:\n");
    for (const failure of failures) {
      console.error(failure);
      console.error("");
    }
    console.error(
      `${failures.length} of ${checks.length} smoke checks failed.`,
    );
    process.exit(1);
  }

  console.log(`\nAll ${checks.length} smoke checks passed.`);
}

main().catch((err) => {
  console.error("Smoke test runner crashed:", err);
  process.exit(1);
});
