import { expect, test } from '@playwright/test';

// Playwright waits for an element to be ready before it clicks.
// This test does not call waitForTimeout. The Brew button enables itself.
test.describe('auto-waiting @foundation', () => {
  test('clicks Brew after the page enables it', async ({ page }) => {
    await page.goto('/waiting');
    // Ready means the page has finished its own delay.
    await expect(page.getByRole('status')).toHaveText('Ready');
    // click() waits until Brew is enabled, then presses it.
    await page.getByRole('button', { name: 'Brew' }).click();
    await expect(page.getByRole('status')).toHaveText('Brewing');
  });
});
