import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * 플로우 3: AI 어시스턴트 질의-응답
 * docs/user-flows.md 참조
 */
test.describe('AI 어시스턴트 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('AI 어시스턴트 페이지 진입 — 세션 목록 표시', async ({ page }) => {
    await page.goto('/ai');
    await expect(page.getByRole('heading', { name: /AI|어시스턴트/i })).toBeVisible();
    // 새 대화 버튼 또는 입력창 확인
    await expect(
      page.getByRole('button', { name: /새 대화|new chat/i })
        .or(page.getByPlaceholder(/질문|message|질의/i))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('새 AI 세션 생성', async ({ page }) => {
    await page.goto('/ai');
    const newChatBtn = page.getByRole('button', { name: /새 대화|new chat/i });
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
    }
    // 메시지 입력창 활성화 확인
    await expect(page.getByPlaceholder(/질문|message|질의/i)).toBeVisible({ timeout: 5_000 });
  });

  test('AI 질의 전송 → 스트리밍 응답 수신', async ({ page }) => {
    await page.goto('/ai');

    // 새 세션 시작
    const newChatBtn = page.getByRole('button', { name: /새 대화|new chat/i });
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
    }

    const input = page.getByPlaceholder(/질문|message|질의/i);
    await input.fill('안녕하세요, 테스트 질의입니다.');
    await page.keyboard.press('Enter');

    // 타이핑 인디케이터(로딩) 또는 응답 텍스트 확인
    await expect(
      page.locator('.app-ai-typing-dot').first()
        .or(page.getByRole('status', { name: /생성 중|thinking/i }))
        .or(page.locator('[data-testid="ai-response"]'))
    ).toBeVisible({ timeout: 5_000 });

    // 응답 완료 확인 (최대 30초)
    await expect(page.locator('[data-testid="ai-response"]').or(
      page.getByRole('article').last()
    )).toBeVisible({ timeout: 30_000 });
  });

  test('AI 응답에 타이핑 인디케이터 표시', async ({ page }) => {
    await page.goto('/ai');

    const newChatBtn = page.getByRole('button', { name: /새 대화|new chat/i });
    if (await newChatBtn.isVisible()) {
      await newChatBtn.click();
    }

    const input = page.getByPlaceholder(/질문|message|질의/i);
    await input.fill('결재 현황을 요약해 주세요.');

    // 전송 전 인디케이터 없음
    await expect(page.locator('.app-ai-typing-dot').first()).not.toBeVisible();

    await page.keyboard.press('Enter');

    // 전송 직후 인디케이터 표시 (스트리밍 시작)
    await expect(
      page.locator('.app-ai-typing-dot').first()
        .or(page.getByRole('status'))
    ).toBeVisible({ timeout: 5_000 });
  });

  test('사이드바에서 AI 어시스턴트 메뉴 접근', async ({ page }) => {
    await page.goto('/dashboard');
    const aiMenuLink = page.getByRole('link', { name: /AI|어시스턴트/i });
    await expect(aiMenuLink).toBeVisible();
    await aiMenuLink.click();
    await expect(page).toHaveURL(/.*\/ai/);
  });
});
