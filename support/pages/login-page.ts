import type { Locator, Page } from '@playwright/test';

// The page object holds the login locators so a test can call signIn
// instead of repeating the labels and the button.
export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByLabel('Username');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async open() {
    await this.page.goto('/login');
  }

  // Fills the two fields and clicks Sign in. The test still asserts the result.
  async signIn(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }
}
