/**
 * Smoke Tests - Critical Paths
 * Purpose: Quick tests to verify core functionality
 * Description: Run after deployment to verify system is working
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Critical Paths', () => {
  test('Homepage loads', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.getByTestId('header')).toBeVisible();
  });

  test('Can view products', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId('product-grid')).toBeVisible();
    await expect(page.getByTestId('product-card')).toHaveCount.greaterThan(0);
  });

  test('Can search products', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.press('[data-testid="search-input"]', 'Enter');
    await expect(page.getByTestId('search-results')).toBeVisible();
  });

  test('Can add to cart', async ({ page }) => {
    await page.goto('/products/1');
    await page.click('[data-testid="add-to-cart"]');
    await expect(page.getByText(/added to cart/i)).toBeVisible();
  });

  test('API health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('Database connectivity', async ({ request }) => {
    const response = await request.get('/api/health/db');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.database).toBe('connected');
  });

  test('Can login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', 'test@example.com');
    await page.fill('[data-testid="login-password"]', 'password');
    await page.click('[data-testid="login-submit"]');
    
    // Should redirect to dashboard or homepage
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('Payment gateway is reachable', async ({ request }) => {
    const response = await request.get('/api/payments/health');
    expect(response.status()).toBe(200);
  });

  test('CDN is serving assets', async ({ page }) => {
    await page.goto('/');
    const logoSrc = await page.locator('[data-testid="logo"]').getAttribute('src');
    expect(logoSrc).toBeTruthy();
    
    const response = await page.goto(logoSrc!);
    expect(response?.status()).toBe(200);
  });

  test('Error tracking is working', async ({ page }) => {
    // Trigger error
    await page.goto('/404-page-that-does-not-exist');
    
    // Error should be tracked (check console or error tracking service)
    // This is a placeholder - implement based on your error tracking
    await expect(page).toHaveURL(/404/);
  });
});
