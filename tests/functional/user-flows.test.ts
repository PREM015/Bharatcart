/**
 * User Flow Tests
 * Purpose: Tests complete user journeys
 * Description: End-to-end user scenarios
 */

import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should complete full registration process', async ({ page }) => {
    await page.goto('/');
    
    // Click sign up
    await page.click('[data-testid="signup-button"]');
    
    // Fill registration form
    await page.fill('[data-testid="signup-name"]', 'John Doe');
    await page.fill('[data-testid="signup-email"]', `test${Date.now()}@example.com`);
    await page.fill('[data-testid="signup-password"]', 'SecurePass123!');
    await page.fill('[data-testid="signup-confirm-password"]', 'SecurePass123!');
    
    // Accept terms
    await page.check('[data-testid="accept-terms"]');
    
    // Submit
    await page.click('[data-testid="signup-submit"]');
    
    // Should verify email
    await expect(page.getByText(/verify your email/i)).toBeVisible();
    
    // Mock email verification
    await page.goto('/verify-email?token=mock-token');
    
    // Should be logged in
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });
});

test.describe('Product Discovery Flow', () => {
  test('should find product through search', async ({ page }) => {
    await page.goto('/');
    
    // Search for product
    await page.fill('[data-testid="search-input"]', 'laptop');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Should show results
    await expect(page.getByTestId('search-results')).toBeVisible();
    await expect(page.getByTestId('product-card')).toHaveCount.greaterThan(0);
    
    // Click first product
    await page.click('[data-testid="product-card"]');
    
    // Should show product details
    await expect(page.getByTestId('product-details')).toBeVisible();
  });

  test('should browse by category', async ({ page }) => {
    await page.goto('/');
    
    // Click category
    await page.click('[data-testid="category-electronics"]');
    
    // Should show category page
    await expect(page).toHaveURL(/\/categories\/electronics/);
    await expect(page.getByTestId('product-grid')).toBeVisible();
    
    // Apply filters
    await page.click('[data-testid="filter-price"]');
    await page.fill('[data-testid="price-min"]', '10000');
    await page.fill('[data-testid="price-max"]', '50000');
    await page.click('[data-testid="apply-filters"]');
    
    // Should update results
    await expect(page.getByTestId('product-card')).toHaveCount.greaterThan(0);
  });
});

test.describe('Purchase Flow', () => {
  test('should complete full purchase as guest', async ({ page }) => {
    await page.goto('/products/1');
    
    // Add to cart
    await page.click('[data-testid="add-to-cart"]');
    await expect(page.getByText(/added to cart/i)).toBeVisible();
    
    // Go to cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page).toHaveURL(/\/cart/);
    
    // Proceed to checkout
    await page.click('[data-testid="checkout-button"]');
    
    // Fill shipping info
    await page.fill('[data-testid="shipping-name"]', 'John Doe');
    await page.fill('[data-testid="shipping-email"]', 'john@example.com');
    await page.fill('[data-testid="shipping-phone"]', '9876543210');
    await page.fill('[data-testid="shipping-address"]', '123 Main St');
    await page.fill('[data-testid="shipping-city"]', 'Mumbai');
    await page.fill('[data-testid="shipping-pincode"]', '400001');
    
    await page.click('[data-testid="continue-to-payment"]');
    
    // Select payment method
    await page.click('[data-testid="payment-card"]');
    
    // Fill card details (test mode)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    
    // Place order
    await page.click('[data-testid="place-order"]');
    
    // Should show confirmation
    await expect(page.getByText(/order confirmed/i)).toBeVisible();
    await expect(page.getByTestId('order-number')).toBeVisible();
  });

  test('should complete purchase as logged in user', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', 'user@example.com');
    await page.fill('[data-testid="login-password"]', 'password');
    await page.click('[data-testid="login-submit"]');
    
    // Browse and add product
    await page.goto('/products/1');
    await page.click('[data-testid="add-to-cart"]');
    
    // Checkout with saved address
    await page.click('[data-testid="cart-icon"]');
    await page.click('[data-testid="checkout-button"]');
    
    // Select saved address
    await page.click('[data-testid="saved-address-1"]');
    await page.click('[data-testid="continue-to-payment"]');
    
    // Use saved payment method
    await page.click('[data-testid="saved-card-1"]');
    await page.click('[data-testid="place-order"]');
    
    // Confirm
    await expect(page.getByText(/order confirmed/i)).toBeVisible();
  });
});

test.describe('Account Management Flow', () => {
  test('should update profile information', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', 'user@example.com');
    await page.fill('[data-testid="login-password"]', 'password');
    await page.click('[data-testid="login-submit"]');
    
    // Go to profile
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="profile-link"]');
    
    // Edit profile
    await page.click('[data-testid="edit-profile"]');
    await page.fill('[data-testid="profile-name"]', 'Jane Doe');
    await page.fill('[data-testid="profile-phone"]', '9876543210');
    await page.click('[data-testid="save-profile"]');
    
    // Should show success
    await expect(page.getByText(/profile updated/i)).toBeVisible();
  });

  test('should add new address', async ({ page }) => {
    // Login and go to addresses
    await page.goto('/login');
    await page.fill('[data-testid="login-email"]', 'user@example.com');
    await page.fill('[data-testid="login-password"]', 'password');
    await page.click('[data-testid="login-submit"]');
    
    await page.goto('/account/addresses');
    
    // Add address
    await page.click('[data-testid="add-address"]');
    await page.fill('[data-testid="address-name"]', 'Home');
    await page.fill('[data-testid="address-street"]', '456 Park Ave');
    await page.fill('[data-testid="address-city"]', 'Delhi');
    await page.fill('[data-testid="address-pincode"]', '110001');
    await page.click('[data-testid="save-address"]');
    
    // Should show in list
    await expect(page.getByText('Home')).toBeVisible();
    await expect(page.getByText('456 Park Ave')).toBeVisible();
  });
});

test.describe('Customer Support Flow', () => {
  test('should track order', async ({ page }) => {
    await page.goto('/track-order');
    
    await page.fill('[data-testid="order-number"]', 'ORD-2024-00001');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.click('[data-testid="track-button"]');
    
    // Should show tracking info
    await expect(page.getByTestId('tracking-timeline')).toBeVisible();
    await expect(page.getByText(/in transit/i)).toBeVisible();
  });

  test('should submit contact form', async ({ page }) => {
    await page.goto('/contact');
    
    await page.fill('[data-testid="contact-name"]', 'John Doe');
    await page.fill('[data-testid="contact-email"]', 'john@example.com');
    await page.fill('[data-testid="contact-subject"]', 'Product inquiry');
    await page.fill('[data-testid="contact-message"]', 'I have a question about...');
    await page.click('[data-testid="contact-submit"]');
    
    await expect(page.getByText(/message sent/i)).toBeVisible();
  });
});
