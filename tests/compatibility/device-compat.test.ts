/**
 * Device Compatibility Tests
 * Purpose: Tests across different devices and screen sizes
 * Description: Ensures responsive design works correctly
 */

import { test, expect, devices } from '@playwright/test';

const testDevices = [
  { name: 'iPhone 12', ...devices['iPhone 12'] },
  { name: 'iPhone 12 Pro', ...devices['iPhone 12 Pro'] },
  { name: 'Pixel 5', ...devices['Pixel 5'] },
  { name: 'iPad Pro', ...devices['iPad Pro'] },
  { name: 'Galaxy S21', ...devices['Galaxy S9+'] },
];

for (const device of testDevices) {
  test.describe(`${device.name} Compatibility`, () => {
    test.use(device);

    test('should render mobile navigation', async ({ page }) => {
      await page.goto('/');
      
      // Mobile menu should be visible
      await expect(page.getByTestId('mobile-menu-button')).toBeVisible();
      
      // Desktop nav should be hidden
      await expect(page.getByTestId('desktop-nav')).not.toBeVisible();
    });

    test('should handle touch events', async ({ page }) => {
      await page.goto('/products');
      
      const productCard = page.getByTestId('product-card').first();
      
      // Tap product
      await productCard.tap();
      
      // Should navigate to product page
      await expect(page).toHaveURL(/\/products\/.+/);
    });

    test('should support swipe gestures', async ({ page }) => {
      await page.goto('/');
      
      const carousel = page.getByTestId('hero-carousel');
      const box = await carousel.boundingBox();
      
      if (box) {
        // Swipe left
        await page.touchscreen.tap(box.x + box.width - 50, box.y + box.height / 2);
        await page.touchscreen.move(box.x + 50, box.y + box.height / 2);
        
        // Wait for animation
        await page.waitForTimeout(500);
        
        // Should show next slide
        await expect(page.getByTestId('carousel-slide-2')).toBeVisible();
      }
    });

    test('should have readable text', async ({ page }) => {
      await page.goto('/products');
      
      const productTitle = page.getByTestId('product-title').first();
      const fontSize = await productTitle.evaluate(
        el => window.getComputedStyle(el).fontSize
      );
      
      // Font size should be at least 14px on mobile
      expect(parseInt(fontSize)).toBeGreaterThanOrEqual(14);
    });

    test('should have tappable buttons', async ({ page }) => {
      await page.goto('/');
      
      const button = page.getByTestId('cta-button').first();
      const box = await button.boundingBox();
      
      // Buttons should be at least 44x44px (iOS guideline)
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });

    test('should handle orientation change', async ({ page }) => {
      await page.goto('/products');
      
      // Portrait mode
      await expect(page.getByTestId('product-grid')).toBeVisible();
      
      // Landscape mode (if applicable)
      if (device.name.includes('iPhone') || device.name.includes('Pixel')) {
        await page.setViewportSize({ width: 844, height: 390 }); // Landscape
        await expect(page.getByTestId('product-grid')).toBeVisible();
      }
    });
  });
}

test.describe('Responsive Breakpoints', () => {
  const breakpoints = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: '4K', width: 3840, height: 2160 },
  ];

  for (const bp of breakpoints) {
    test(`should work at ${bp.name} resolution`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/');
      
      await expect(page.getByTestId('header')).toBeVisible();
      await expect(page.getByTestId('footer')).toBeVisible();
      
      // Take screenshot for visual verification
      await page.screenshot({
        path: `tests/screenshots/${bp.name.toLowerCase()}.png`,
        fullPage: true,
      });
    });
  }
});
