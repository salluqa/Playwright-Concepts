import { expect, test } from '@playwright/test';

test.describe('assertions @foundation', () => {
  test('checks the status before and after save', async ({ page }) => {
    await page.goto('/assertions');
    const status = page.getByRole('status');

    await expect(status).toHaveText('Not saved');
    await page.getByRole('button', { name: 'Save invoice' }).click();
    await expect(status).toHaveText('Invoice saved');
  });
});
