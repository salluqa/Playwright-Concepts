import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

type AccountFile = {
  users: { username: string; password: string; role: string; name: string }[];
};

// The username and password live in the local demo fixture, not in the test body.
const accountsPath = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/accounts.json');
const accounts = JSON.parse(readFileSync(accountsPath, 'utf8')) as AccountFile;
const admin = accounts.users.find((user) => user.role === 'admin');

if (!admin) {
  throw new Error('Demo admin account is missing from fixtures/accounts.json');
}

// One test is the successful sign-in. The other is the error the form shows.
test.describe('login form @foundation', () => {
  test('signs in with the local demo account', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(admin.username);
    await page.getByLabel('Password').fill(admin.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // The status sentence includes the display name from the fixture.
    await expect(page.getByRole('status')).toHaveText(`Signed in as ${admin.name}`);
  });

  test('shows an error for a bad password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Username').fill(admin.username);
    // A wrong password must stay on the form and show the alert.
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText('The username or password is incorrect.');
    // The heading is still Sign in, so the failed attempt did not navigate away.
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
