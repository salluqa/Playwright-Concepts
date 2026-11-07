# Automating Login Forms and Error Messages

### 1. What Is a Login Check?

A login check proves that a valid account gets in, and that a bad password stays out and says why. You find the fields, enter the values, submit the form, and then assert the page the person should see.

The fields in this lesson are normal inputs with visible labels. `getByLabel('Username')` and `getByLabel('Password')` find them from those labels. `fill()` replaces whatever is in the field. The Sign in button submits the form. A success moves to a home page. A failure stays on the form and shows an alert, which is the error message on the page.

The account is local. The username, password, and display name live in `fixtures/accounts.json`. The demo server accepts them only on your machine. They are not a production password.

### 2. Why Do We Need It?

A locked door is not tested by pushing it once. You try a key that should open it, and a key that should not. Both results belong in the test case.

If you assert only that the click finished, a bad password that still opens Home looks like a pass. If you assert only that some error area is visible, the wrong sentence can pass. The expected result for a bad password is the sentence the product shows.

### 3. Implementation

The smallest success check is the signed-in status:

```ts
await expect(page.getByRole('status')).toHaveText(`Signed in as ${admin.name}`);
```

`admin` is the demo user read from the accounts file.

The practical test types that user's fields and submits.

```ts
await page.goto('/login');
await page.getByLabel('Username').fill(admin.username);
await page.getByLabel('Password').fill(admin.password);
await page.getByRole('button', { name: 'Sign in' }).click();
await expect(page.getByRole('status')).toHaveText(`Signed in as ${admin.name}`);
```

`goto` opens the form.

The label locators find the inputs without depending on classes.

`fill` enters the demo username and password.

`click` submits the form.

The status assertion requires the display name from the same file, so the test follows a successful sign-in rather than a URL alone.

A second test uses the same username and the password `wrong-password`.

It expects the alert "The username or password is incorrect." and expects the Sign in heading to remain.

The heading check is separate: it shows the person is still on the form, not signed in.

The heading also stays visible because a failed sign-in must not open Home.

### 4. Expected Result

A passing success run ends on Home with "Signed in as Ada Lovelace", the name stored for the demo admin. A passing failure run stays on Sign in and shows "The username or password is incorrect." A failing run means the status or the alert text did not match.

### 5. Takeaways

- Find login fields by their labels, then assert the page the user should see.
- Cover a valid account and a bad password as separate tests.
- Assert the error sentence, not only that an error area exists.
- Keep the demo password in the local fixture. Do not reuse it elsewhere.

**Interview question:** What should a login test assert after a bad password?

**Answer:** The user must remain signed out, and the page should show the specific error. A click that finishes is not proof that access was denied.

### 6. References

- [Input](https://playwright.dev/docs/input)
- [Locators](https://playwright.dev/docs/locators)

**SEO video title:** Playwright Login Test: Automate Forms and Error Messages

Join the TechNexuz WhatsApp Community to discuss tech, test automation, and QA strategies:  https://chat.whatsapp.com/HPaOvG8XfDWAotDX2mHfFM

#QA #QAEngineer #QualityAssurance #SoftwareTesting #SQA #TestAutomation #AutomationTesting #SDET #QAAutomation #Playwright #TypeScript  #WebAutomation  #APITesting  #TestFramework #AITesting #SoftwareQuality
