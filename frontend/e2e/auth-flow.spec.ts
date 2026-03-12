import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can login and access protected area', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Verify login page loaded
    expect(page.url()).toContain('/login');
    await expect(page.locator('text=Accedi')).toBeVisible();

    // Fill in credentials
    await page.fill('input[name="userId"]', 'admin');
    await page.fill('input[name="password"]', 'ChangeMe123!');

    // Submit form
    await page.click('button:has-text("Accedi")');

    // Wait for redirect and verify we're in app
    await page.waitForURL('**/app/**');
    expect(page.url()).toContain('/app');

    // Verify app shell is visible
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
  });

  test('user cannot login with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Try to login with wrong password
    await page.fill('input[name="userId"]', 'admin');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Accedi")');

    // Verify error message appears
    await expect(
      page.locator('text=/non valide|unauthorized/i')
    ).toBeVisible({ timeout: 5000 });

    // Verify still on login page
    expect(page.url()).toContain('/login');
  });

  test('user can logout and returns to login page', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="userId"]', 'admin');
    await page.fill('input[name="password"]', 'ChangeMe123!');
    await page.click('button:has-text("Accedi")');
    await page.waitForURL('**/app/**');

    // Find and click logout button
    await page.click('text=Logout');

    // Verify redirect to login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated user cannot access protected routes', async ({
    page,
  }) => {
    // Try to access protected page without auth
    await page.goto('/app/services');

    // Should redirect to login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });

  test('forgot password link works', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    await page.click('text=Password dimenticata');

    // Verify redirect
    await expect(page.url()).toContain('/forgot-password');
    await expect(page.locator('text=Reset password')).toBeVisible();
  });
});
