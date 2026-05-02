/**
 * Step 14 smoke tests — every route loads cleanly and shows its
 * expected heading. Zero console.error tolerance per ADR-093 §S4 +
 * the project's Browser Validation Gate.
 *
 * These four tests run on every CI invocation and on every Honesty
 * Checkpoint. They're the canary for "did this branch break the
 * basic app?"
 *
 * Future steps fill in deeper coverage:
 *   Step 16 — UI element coverage (≥30 assertions per ui-inventory.md)
 *   Step 17 — Workflow E2E (Supabase / functions stubbed via routes)
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/** Capture-and-fail-on-console-error helper. Must be installed BEFORE goto. */
function attachConsoleErrorGuard(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push('PAGE_ERROR: ' + err.message));
  page.on('weberror', (err) => errors.push('WEB_ERROR: ' + err.error().message));
  return { errors };
}

test.describe('smoke — every route loads cleanly', () => {
  test('Index `/` renders heading + zero console errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    const resp = await page.goto('/');
    expect(resp?.status()).toBe(200);
    // h1 reads from widgetConfig.title (default "Goal-Oriented Action Planning")
    await expect(page.getByRole('heading', { level: 1, name: /goal[- ]oriented action planning/i })).toBeVisible();
    await page.waitForTimeout(500); // give async error-boundary triggers a tick to fire
    expect(guard.errors, 'no console errors on /').toEqual([]);
  });

  test('Agents `/agents` renders heading + zero console errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    const resp = await page.goto('/agents');
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: /coding agent swarm/i })).toBeVisible();
    await page.waitForTimeout(500);
    expect(guard.errors, 'no console errors on /agents').toEqual([]);
  });

  test('Demo `/demo` renders heading + zero console errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    const resp = await page.goto('/demo');
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: /embeddable widget demo/i })).toBeVisible();
    await page.waitForTimeout(500);
    expect(guard.errors, 'no console errors on /demo').toEqual([]);
  });

  test('NotFound `/notexist` renders 404 + zero console errors', async ({ page }) => {
    const guard = attachConsoleErrorGuard(page);
    const resp = await page.goto('/notexist');
    // SPA fallback: Vite serves index.html, React Router renders NotFound
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: /^404$/ })).toBeVisible();
    await expect(page.getByText(/page not found/i)).toBeVisible();
    await page.waitForTimeout(500);
    expect(guard.errors, 'no console errors on /notexist (NotFound logs warn, not error)').toEqual([]);
  });
});
