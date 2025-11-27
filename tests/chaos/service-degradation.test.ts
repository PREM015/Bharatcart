/**
 * Service Degradation Chaos Test
 * Purpose: Tests graceful degradation when services fail
 * Description: Simulates partial system failures
 */

import { test, expect } from '@playwright/test';

test.describe('Service Degradation', () => {
  test('should work without search service', async ({ page, context }) => {
    // Block Elasticsearch
    await context.route('**/api/search/**', route => route.abort());

    await page.goto('/');

    // Search should fall back to database search
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.press('[data-testid="search-input"]', 'Enter');

    // Should show fallback search results
    await expect(page.getByText(/showing results/i)).toBeVisible();
  });

  test('should work without Redis cache', async ({ page, context }) => {
    // Simulate Redis failure (slow responses)
    await context.route('**/api/**', async route => {
      // Add delay to simulate cache miss
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });

    await page.goto('/products');

    // Should still load (just slower, from database)
    await expect(page.getByTestId('product-grid')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should handle payment gateway failure', async ({ page, context }) => {
    // Simulate Stripe failure
    await context.route('**/api/payments/stripe/**', route =>
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service temporarily unavailable' }),
      })
    );

    await page.goto('/checkout');

    // Should show alternative payment methods
    await expect(page.getByText(/try alternative payment/i)).toBeVisible();
    await expect(page.getByText(/PayPal/i)).toBeVisible();
  });

  test('should handle CDN failure', async ({ page, context }) => {
    // Block CDN images
    await context.route('**/cdn.bharatcart.com/**', route => route.abort());

    await page.goto('/products');

    // Should show fallback/placeholder images
    const images = await page.locator('[data-testid="product-image"]').all();
    for (const img of images) {
      const src = await img.getAttribute('src');
      expect(src).toContain('placeholder');
    }
  });

  test('should handle email service failure', async ({ page, context }) => {
    // Simulate email service down
    await context.route('**/api/notifications/email', route =>
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Email service unavailable' }),
      })
    );

    // Complete order
    await page.goto('/checkout');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.click('[data-testid="place-order"]');

    // Order should still be placed
    await expect(page.getByText(/order placed successfully/i)).toBeVisible();
    
    // Should show warning about email
    await expect(page.getByText(/confirmation email may be delayed/i)).toBeVisible();
  });
});
