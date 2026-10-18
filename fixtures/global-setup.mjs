import { readFileSync } from 'node:fs';

export default async function globalSetup() {
  const accounts = JSON.parse(readFileSync(new URL('./accounts.json', import.meta.url), 'utf8'));
  if (!accounts.users.some((user) => user.role === 'admin')) {
    throw new Error('Demo admin account is missing from fixtures/accounts.json');
  }
}
