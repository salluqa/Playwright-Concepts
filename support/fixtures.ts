import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login-page';

type DemoFixtures = {
  loginPage: LoginPage;
};

// loginPage opens the login screen before the test body runs.
// Tests import { test, expect } from this file, not from @playwright/test.
export const test = base.extend<DemoFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
