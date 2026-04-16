import { test, expect } from '@playwright/test';
import { login, logout, TEST_USER } from './helpers/auth';

/**
 * 플로우 1: 로그인 / SSO 인증
 * docs/user-flows.md 참조
 */
test.describe('인증 플로우', () => {
  test('미인증 접근 시 /login 리다이렉트', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
  });

  test('로그인 성공 → /dashboard 이동', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/.*dashboard/);
    // 사용자 이름 또는 환영 메시지 확인
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('잘못된 비밀번호 → 에러 메시지 표시', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/이메일|email/i).fill(TEST_USER.email);
    await page.getByLabel(/비밀번호|password/i).fill('WrongPassword!');
    await page.getByRole('button', { name: /로그인|sign in/i }).click();
    // 로그인 페이지에 머물며 에러 표시
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('alert').or(page.getByText(/잘못|incorrect|invalid/i))).toBeVisible();
  });

  test('페이지 새로고침 후 세션 유지', async ({ page }) => {
    await login(page);
    await page.reload();
    // 세션 유지 확인 — 로그인 페이지로 튀어나가지 않아야 함
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('로그아웃 → /login 이동', async ({ page }) => {
    await login(page);
    await logout(page);
    await expect(page).toHaveURL(/.*login/);
  });

  test('로그아웃 후 /dashboard 직접 접근 시 /login 리다이렉트', async ({ page }) => {
    await login(page);
    await logout(page);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });
});
