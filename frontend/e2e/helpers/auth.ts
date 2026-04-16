import { Page } from '@playwright/test';

export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'admin@test.com',
  password: process.env.E2E_TEST_PASSWORD || 'Test1234!',
};

export const TEST_APPROVER = {
  email: process.env.E2E_APPROVER_EMAIL || 'approver@test.com',
  password: process.env.E2E_APPROVER_PASSWORD || 'Test1234!',
};

/** 로그인 수행 후 대시보드 진입 확인 */
export async function login(page: Page, user = TEST_USER) {
  await page.goto('/login');
  // Suspense 해제 대기
  await page.waitForLoadState('networkidle');
  // id 기반 셀렉터 (label htmlFor="email" 연결)
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);
  await page.getByRole('button', { name: /^로그인$/ }).click();
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

/** 로그아웃 수행 */
export async function logout(page: Page) {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /로그아웃|logout/i }).click();
  await page.waitForURL('**/login', { timeout: 5_000 });
}
