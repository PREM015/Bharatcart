/**
 * Browser Compatibility Tests
 * Purpose: Tests across different browsers and versions
 * Description: Ensures consistent behavior across browsers
 */

import { test, expect, devices } from '@playwright/test';

const browsers = [
  { name: 'Chrome', ...devices['Desktop Chrome'] },
  { name: 'Firefox', ...devices['Desktop Firefox'] },
  { name: 'Safari', ...devices['Desktop Safari'] },
  { name: 'Edge', ...devices['Desktop Edge'] },
];

for (const browser of browsers) {
  test.describe(`${browser.name} Compatibility`, () => {
    test.use(browser);

    test('should render homepage correctly', async ({ page }) => {
      await page.goto('/');
      
      await expect(page.getByTestId('header')).toBeVisible();
      await expect(page.getByTestId('hero-section')).toBeVisible();
      await expect(page.getByTestId('footer')).toBeVisible();
    });

    test('should handle CSS correctly', async ({ page }) => {
      await page.goto('/products');
      
      const productCard = page.getByTestId('product-card').first();
      
      // Check CSS is applied
      const bgColor = await productCard.evaluate(
        el => window.getComputedStyle(el).backgroundColor
      );
      expect(bgColor).toBeTruthy();
      
      // Check layout
      const box = await productCard.boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
    });

    test('should support modern JS features', async ({ page }) => {
      await page.goto('/');
      
      // Test optional chaining
      const result = await page.evaluate(() => {
        const obj: any = { a: { b: { c: 'test' } } };
        return obj?.a?.b?.c;
      });
      expect(result).toBe('test');
      
      // Test nullish coalescing
      const nullish = await page.evaluate(() => {
        const val = null ?? 'default';
        return val;
      });
      expect(nullish).toBe('default');
    });

    test('should handle localStorage', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        localStorage.setItem('test', 'value');
      });
      
      const value = await page.evaluate(() => {
        return localStorage.getItem('test');
      });
      
      expect(value).toBe('value');
    });

    test('should support web APIs', async ({ page }) => {
      await page.goto('/');
      
      // Check fetch API
      const hasFetch = await page.evaluate(() => 'fetch' in window);
      expect(hasFetch).toBe(true);
      
      // Check IntersectionObserver
      const hasIO = await page.evaluate(() => 'IntersectionObserver' in window);
      expect(hasIO).toBe(true);
    });
  });
}
