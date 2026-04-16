# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-assistant.spec.ts >> AI 어시스턴트 플로우 >> AI 질의 전송 → 스트리밍 응답 수신
- Location: e2e/ai-assistant.spec.ts:33:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3001/login", waiting until "load"

```

# Test source

```ts
  1  | import { Page } from '@playwright/test';
  2  | 
  3  | export const TEST_USER = {
  4  |   email: process.env.E2E_TEST_EMAIL || 'admin@test.com',
  5  |   password: process.env.E2E_TEST_PASSWORD || 'Test1234!',
  6  | };
  7  | 
  8  | export const TEST_APPROVER = {
  9  |   email: process.env.E2E_APPROVER_EMAIL || 'approver@test.com',
  10 |   password: process.env.E2E_APPROVER_PASSWORD || 'Test1234!',
  11 | };
  12 | 
  13 | /** 로그인 수행 후 대시보드 진입 확인 */
  14 | export async function login(page: Page, user = TEST_USER) {
> 15 |   await page.goto('/login');
     |              ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  16 |   // Suspense 해제 대기
  17 |   await page.waitForLoadState('networkidle');
  18 |   // id 기반 셀렉터 (label htmlFor="email" 연결)
  19 |   await page.locator('#email').fill(user.email);
  20 |   await page.locator('#password').fill(user.password);
  21 |   await page.getByRole('button', { name: /^로그인$/ }).click();
  22 |   await page.waitForURL('**/dashboard', { timeout: 10_000 });
  23 | }
  24 | 
  25 | /** 로그아웃 수행 */
  26 | export async function logout(page: Page) {
  27 |   await page.goto('/dashboard');
  28 |   await page.waitForLoadState('networkidle');
  29 |   await page.getByRole('button', { name: /로그아웃|logout/i }).click();
  30 |   await page.waitForURL('**/login', { timeout: 5_000 });
  31 | }
  32 | 
```