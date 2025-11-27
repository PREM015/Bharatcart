/**
 * Network Failure Chaos Test
 * Purpose: Tests system resilience to network failures
 * Description: Simulates network outages and latency
 */

import { test, expect } from '@playwright/test';

test.describe('Network Failure Resilience', () => {
  test('should handle API timeout gracefully', async ({ page, context }) => {
    // Simulate slow network
    await context.route('**/api/**', route => {
      setTimeout(() => route.continue(), 10000); // 10s delay
    });

    await page.goto('/products');

    // Should show loading state
    await expect(page.getByTestId('loading-spinner')).toBeVisible();

    // Should show timeout error after threshold
    await expect(page.getByText(/request timeout/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test('should retry failed requests', async ({ page, context }) => {
    let attemptCount = 0;

    await context.route('**/api/products', route => {
      attemptCount++;
      if (attemptCount < 3) {
        route.abort('failed'); // Fail first 2 attempts
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [] }),
        });
      }
    });

    await page.goto('/products');

    // Should eventually succeed after retries
    await expect(page.getByTestId('product-grid')).toBeVisible({
      timeout: 10000,
    });

    expect(attemptCount).toBe(3);
  });

  test('should work offline with cached data', async ({ page, context }) => {
    // Load page first (cache data)
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Navigate to another page
    await page.goto('/cart');

    // Should still work with cached data
    await expect(page.getByTestId('cart-container')).toBeVisible();
  });

  test('should handle intermittent connectivity', async ({ page, context }) => {
    let isOnline = true;

    await context.route('**/api/**', route => {
      if (isOnline) {
        route.continue();
      } else {
        route.abort('failed');
      }
    });

    await page.goto('/products');

    // Simulate going offline
    isOnline = false;
    await page.click('[data-testid="refresh-button"]');
    await expect(page.getByText(/connection lost/i)).toBeVisible();

    // Simulate coming back online
    isOnline = true;
    await page.click('[data-testid="refresh-button"]');
    await expect(page.getByTestId('product-grid')).toBeVisible();
  });
});
