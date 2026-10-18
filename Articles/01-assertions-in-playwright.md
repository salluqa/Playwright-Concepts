# Assertions in Playwright

### 1. What Is an Assertion?

An assertion is the check you make after something happens. In a manual test you do a step, then you look at the screen and compare it with the expected result. If you click Save and the page still says the invoice is not saved, the test fails. The click is not the result.

Playwright Test writes that check with `expect()`. You give `expect` a locator, which is a description of an element, and then a matcher. A matcher is the condition you want to be true. `toHaveText` checks exact text. `toBeVisible` checks that an element is shown.

These locator checks are web-first assertions. A web-first assertion retries until the condition is true or time runs out. This project sets that limit to five seconds in `playwright.config.ts`.

You can reverse a matcher with `not`. `expect(status).not.toHaveText('Invoice failed')` fails when that wrong sentence is present. Use `not` when the result you need is the absence of a message.

### 2. Why Do We Need It?

Pressing the button on a coffee machine is an action. Looking in the cup to see that coffee is there is the assertion. If you only press the button, you cannot tell a full cup from an empty one.

Clicking Save invoice asks the page to save. It does not prove the save worked. A test that ends on the click can pass while the status still says "Not saved". The expected result has to be its own check.

### 3. Implementation

Start with the check alone. The matcher requires the words "Invoice saved".

```ts
const status = page.getByRole('status');
await expect(status).toHaveText('Invoice saved');
```

`getByRole('status')` finds the message a person would read after saving. `expect` and `toHaveText` form the web-first check. Playwright keeps looking until the text matches or five seconds pass.

The practical test opens the local demo, confirms the starting message, clicks, and checks the new message. `goto('/assertions')` uses `baseURL` from the Playwright config.

```ts
await page.goto('/assertions');
const status = page.getByRole('status');
await expect(status).toHaveText('Not saved');
await page.getByRole('button', { name: 'Save invoice' }).click();
await expect(status).toHaveText('Invoice saved');
```

`goto` opens the page. The first `toHaveText` records the start, "Not saved", so a later pass cannot come from text that was already there. `click` is only the action. The second `toHaveText` is the result of that action. The script does not also check that the text is not "Invoice failed". The exact success message already answers that question.

### 4. Expected Result

A passing run starts at "Not saved", clicks Save invoice, and ends with "Invoice saved". A failing run means one of those texts did not match before the five-second assertion timeout.

### 5. Takeaways

- `click` performs an action. `expect()` checks the result.
- A matcher such as `toHaveText` states the expected result.
- Web-first assertions retry until they pass or the timeout ends.
- Use `not` when the result is the absence of a specific message.

**Interview question:** What is the difference between clicking Save and asserting the status text?

**Answer:** The click performs the action. The assertion checks the expected result. Without that check, a test can pass when the save changed nothing the user can see.

### 6. References

- [Assertions](https://playwright.dev/docs/test-assertions)
- [Locator assertions](https://playwright.dev/docs/api/class-locatorassertions)

The runnable script is [01-assertions-in-playwright.spec.ts](../Automation%20Scripts/01-assertions-in-playwright.spec.ts).
