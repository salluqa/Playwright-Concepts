# Locators and Strict Mode

### 1. What Is a Locator?

A locator is the description Playwright uses to find an element. You do not store a found element and hope it stays valid. Playwright searches again when you click or assert. You describe the element. Playwright finds it again when the action or the assertion runs. A role is the kind of control, such as button or status.

`getByRole()` finds a control by its role and accessible name, such as a button named Save. `getByLabel()` finds a field from the label a person reads, such as Email. `getByText()` finds visible text. A CSS selector such as `#invoice-total` finds an element by its id. Prefer a role or a label when the page has one. Use an id when the element has no accessible name.

Strict mode means an action or a single-element assertion must match one element. If two Save buttons match, Playwright stops instead of clicking the first one. That stop is a strict-mode violation.

### 2. Why Do We Need It?

Two cups on a counter can both say Save. You still need the cup for the draft, not the cup for the order you are sending. Clicking the first match is a guess.

Two Save buttons on a page are normal. A test that guesses can pass against the wrong button. A strict-mode error tells you the description was too broad. Starting from the Draft region, then finding Save inside it, matches what a tester would say.

### 3. Implementation

The smallest locator names the button:

```ts
const save = page.getByRole('button', { name: 'Save' });
```

On the demo that line matches two buttons, so a click is rejected. The practical test expects that error, then scopes the click.

```ts
await page.goto('/locators');
const save = page.getByRole('button', { name: 'Save' });
await expect(save.click()).rejects.toThrow(/strict mode violation/);
const draft = page.getByRole('region', { name: 'Draft' });
await draft.getByRole('button', { name: 'Save' }).click();
await expect(page.getByRole('status')).toHaveText('Draft saved');
```

`goto` opens the locators page. The first `click` is the incorrect approach, and the test requires the strict-mode error. `getByRole('region')` finds the Draft section. The inner `getByRole` searches only there. The status must say "Draft saved", which proves the scoped button ran. The script also fills Email with `getByLabel`, checks "Ready to send" with `getByText`, and reads `#invoice-total` with a CSS locator. The id works, and it is a fallback because the total is not a named control.

### 4. Expected Result

A passing run rejects the ambiguous Save click, then sets the status to "Draft saved" from the Draft button. The email field holds the typed address, "Ready to send" is visible, and the total reads "12.00". A failing run means a locator matched nothing, or the status named a different action.

### 5. Takeaways

- Describe controls by role, label, or text before you use CSS.
- Strict mode refuses to act when more than one element matches.
- Narrow the locator from a parent region instead of taking the first match.
- Assert a result that shows which control you meant.

**Interview question:** What does a strict-mode violation mean, and how do you fix it?

**Answer:** The locator matched more than one element, so Playwright refused to guess. Scope it to the parent that makes one match, then repeat the action.

### 6. References

- [Locators](https://playwright.dev/docs/locators)
- [Strictness](https://playwright.dev/docs/locators#strictness)

The runnable script is [02-locators-and-strict-mode.spec.ts](../Automation%20Scripts/02-locators-and-strict-mode.spec.ts).

**SEO video title:** Playwright Locators: Fix the Strict Mode Violation Error

Join the TechNexuz WhatsApp Community to discuss tech, test automation, and QA strategies:  https://chat.whatsapp.com/HPaOvG8XfDWAotDX2mHfFM

#QA #QAEngineer #QualityAssurance #SoftwareTesting #SQA #TestAutomation #AutomationTesting #SDET #QAAutomation #Playwright #TypeScript  #WebAutomation  #APITesting  #TestFramework #AITesting #SoftwareQuality
