import { expect, test } from '@playwright/test';

// A locator must match one element. Strict mode throws when Save matches two buttons.
// Scope the search to the Draft region, then try other locator styles on the same page.
test.describe('locators and strict mode @foundation', () => {
  test('scopes Save to the Draft region', async ({ page }) => {
    await page.goto('/locators');

    // Two buttons are named Save. Clicking the unscoped locator must fail.
    const ambiguous = page.getByRole('button', { name: 'Save' });
    await expect(ambiguous.click()).rejects.toThrow(/strict mode violation/);

    // The region narrows the search to one Save button.
    const draft = page.getByRole('region', { name: 'Draft' });
    await draft.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toHaveText('Draft saved');

    // Label, text, and CSS id are three different ways to point at an element.
    await page.getByLabel('Email').fill('ada@example.com');
    await expect(page.getByLabel('Email')).toHaveValue('ada@example.com');
    await expect(page.getByText('Ready to send')).toBeVisible();
    await expect(page.locator('#invoice-total')).toHaveText('12.00');
  });
});
