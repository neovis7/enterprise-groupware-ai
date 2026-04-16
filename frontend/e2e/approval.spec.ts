import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * 플로우 2: 결재 기안 → 처리 → 조회
 * docs/user-flows.md 참조
 */
test.describe('결재 플로우', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('결재 메뉴 진입 — 내 기안 목록 표시', async ({ page }) => {
    await page.goto('/approvals');
    await expect(page.getByRole('heading', { name: /결재|approval/i })).toBeVisible();
    // 목록 영역(테이블 또는 카드) 존재 확인
    await expect(
      page.getByRole('table').or(page.locator('[data-testid="approval-list"]')).or(page.getByText(/기안|결재 문서/i))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('결재함(대기) 메뉴 진입', async ({ page }) => {
    await page.goto('/approvals/inbox');
    await expect(page.getByRole('heading', { name: /결재함|inbox|대기/i })).toBeVisible();
  });

  test('결재 기안 작성 → 제출', async ({ page }) => {
    await page.goto('/approvals/compose');
    // 제목 입력
    await page.getByLabel(/제목|title/i).fill(`E2E 테스트 기안 ${Date.now()}`);
    // 내용 입력
    await page.getByLabel(/내용|content/i).fill('E2E 테스트를 위한 기안 내용입니다.');
    // 결재자 선택 (구현에 따라 select 또는 combobox)
    const approverSelect = page.getByLabel(/결재자|approver/i);
    if (await approverSelect.isVisible()) {
      await approverSelect.click();
      await page.getByRole('option').first().click();
    }
    // 제출 버튼 클릭
    await page.getByRole('button', { name: /제출|submit|기안/i }).click();
    // 성공: 목록 페이지 이동 또는 성공 토스트
    await expect(
      page.getByText(/제출|완료|success/i).or(page.getByRole('status'))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('결재 상세 페이지 — 결재선 타임라인 표시', async ({ page }) => {
    await page.goto('/approvals');
    // 목록에서 첫 번째 항목 클릭
    const firstRow = page.getByRole('row').nth(1).or(page.locator('[data-testid="approval-item"]').first());
    if (await firstRow.isVisible()) {
      await firstRow.click();
      // 결재선 타임라인 컴포넌트 확인
      await expect(
        page.getByRole('list', { name: /결재 진행 단계/i }).or(page.getByText(/대기|승인|반려/i))
      ).toBeVisible({ timeout: 8_000 });
    }
  });
});
