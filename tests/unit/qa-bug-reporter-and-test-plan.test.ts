import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  MASTER_QA_TEST_CASES,
  MASTER_AUTO_TEST_SUITES,
  QABugEntry,
  getTestCasesForRoute,
  getAutoTestSuitesForRoute,
  getQATestPlanStats,
  formatBugsForAIPrompt,
  normalizeRoutePath,
} from '@/lib/qa-bug-reporter';
import { getDashboardItems } from '@/lib/navigation';

describe('QA Bug Reporter & Master Manual + Auto Test Plan Suite', () => {
  it('should include at least 75+ comprehensive Vietnamese test cases covering Part A (6 E2E flows) and Part B (Modules & UI/AI)', () => {
    const stats = getQATestPlanStats(MASTER_QA_TEST_CASES);
    expect(stats.total).toBeGreaterThanOrEqual(75);
    expect(stats.partACount).toBeGreaterThanOrEqual(18); // 6 E2E flows x 3 layers
    expect(stats.partBCount).toBeGreaterThanOrEqual(57);

    // Ensure all 3 layers are thoroughly represented
    expect(stats.happyPathCount).toBeGreaterThanOrEqual(25);
    expect(stats.edgeValidationCount).toBeGreaterThanOrEqual(25);
    expect(stats.securityConcurrencyCount).toBeGreaterThanOrEqual(25);

    // Ensure all 6 E2E flows exist
    for (let i = 1; i <= 6; i++) {
      const prefix = `E2E-0${i}`;
      const flowCases = MASTER_QA_TEST_CASES.filter((tc) => tc.id.startsWith(prefix));
      expect(flowCases.length).toBeGreaterThanOrEqual(3);
      expect(flowCases.some((c) => c.layer === 'HAPPY_PATH')).toBe(true);
      expect(flowCases.some((c) => c.layer === 'EDGE_VALIDATION')).toBe(true);
      expect(flowCases.some((c) => c.layer === 'SECURITY_CONCURRENCY')).toBe(true);
    }
  });

  it('should cover every single navigation route in getDashboardItems() and all canonical route aliases across all 3 layers', () => {
    const dashboardItems = getDashboardItems();
    expect(dashboardItems.length).toBeGreaterThanOrEqual(21);

    for (const item of dashboardItems) {
      if (!item.href) continue;
      const casesForRoute = getTestCasesForRoute(item.href);
      expect(
        casesForRoute.length,
        `Expected route ${item.href} (${item.name}) to have dedicated QA test cases`
      ).toBeGreaterThanOrEqual(3);

      const layers = new Set(casesForRoute.map((c) => c.layer));
      expect(
        layers.has('HAPPY_PATH'),
        `Route ${item.href} missing HAPPY_PATH test case`
      ).toBe(true);
      expect(
        layers.has('EDGE_VALIDATION'),
        `Route ${item.href} missing EDGE_VALIDATION test case`
      ).toBe(true);
      expect(
        layers.has('SECURITY_CONCURRENCY'),
        `Route ${item.href} missing SECURITY_CONCURRENCY test case`
      ).toBe(true);
    }

    // Verify all requested routes and aliases resolve to valid test cases
    const requiredRoutesAndAliases = [
      '/dashboard',
      '/pos',
      '/kitchen',
      '/invoices',
      '/orders',
      '/tables',
      '/categories',
      '/products',
      '/toppings',
      '/recipes',
      '/Customer',
      '/khachhang',
      '/promotions',
      '/inventory',
      '/suppliers',
      '/purchase-orders',
      '/stock-In',
      '/stock-Count',
      '/reports',
      '/staff',
      '/attendance',
      '/permissions',
      '/settings',
      '/settings/ai',
      '/order',
    ];

    for (const route of requiredRoutesAndAliases) {
      const matched = getTestCasesForRoute(route);
      expect(
        matched.length,
        `Expected alias/route ${route} to return relevant test cases`
      ).toBeGreaterThan(0);
    }
  });

  it('should catalog all 34 Vitest unit test suites + Playwright E2E suites in MASTER_AUTO_TEST_SUITES and verify their files exist on disk', () => {
    const vitestSuites = MASTER_AUTO_TEST_SUITES.filter(
      (s) => s.runner === 'VITEST'
    );
    const playwrightSuites = MASTER_AUTO_TEST_SUITES.filter(
      (s) => s.runner === 'PLAYWRIGHT'
    );

    expect(vitestSuites.length).toBeGreaterThanOrEqual(34);
    expect(playwrightSuites.length).toBeGreaterThanOrEqual(2);

    for (const suite of MASTER_AUTO_TEST_SUITES) {
      const absPath = path.resolve(process.cwd(), suite.filePath);
      expect(
        fs.existsSync(absPath),
        `Expected automated test file ${suite.filePath} to exist on disk`
      ).toBe(true);
      expect(suite.testCount).toBeGreaterThan(0);
      expect(suite.coveredRoutes.length).toBeGreaterThan(0);
      expect(suite.linkedManualIds.length).toBeGreaterThan(0);
    }
  });

  it('should bi-directionally link MASTER_QA_TEST_CASES with autoTestFiles and support getAutoTestSuitesForRoute()', () => {
    const linkedCases = MASTER_QA_TEST_CASES.filter(
      (tc) => tc.autoTestFiles && tc.autoTestFiles.length > 0 && tc.autoTestCommand
    );
    expect(linkedCases.length).toBe(MASTER_QA_TEST_CASES.length);

    const posAutoSuites = getAutoTestSuitesForRoute('/pos');
    expect(posAutoSuites.length).toBeGreaterThanOrEqual(5);
    expect(
      posAutoSuites.some((s) => s.filePath === 'tests/unit/cart-conflict.test.ts')
    ).toBe(true);

    const aiAutoSuites = getAutoTestSuitesForRoute('/settings/ai');
    expect(
      aiAutoSuites.some(
        (s) => s.filePath === 'tests/unit/phase-13-rag-and-agent-upgrade.test.ts'
      )
    ).toBe(true);
  });

  it('should normalize routes with query strings or trailing slashes accurately', () => {
    expect(normalizeRoutePath('/order?table=BAN01')).toBe('/order');
    expect(normalizeRoutePath('/pos/')).toBe('/pos');
    expect(normalizeRoutePath('/invoices')).toBe('/orders');
    expect(normalizeRoutePath('/Customer')).toBe('/khachhang');
    expect(normalizeRoutePath('/settings/ai?tab=playground')).toBe('/settings/ai');
  });

  it('should format in-app QABugEntry items and failed checklist items (with linked Auto Test info) into a structured AI prompt', () => {
    const sampleBugs: QABugEntry[] = [
      {
        id: 'BUG-99001',
        createdAt: '10/11/2026, 08:30:00',
        route: '/pos?table=BAN01',
        userRole: 'Thu ngân',
        userName: 'Trần Tiến',
        viewport: '1366x768px',
        severity: 'CRITICAL',
        title: 'Lỗi không bấm được nút Chuyển bàn khi giỏ hàng có món',
        stepsOrActual: '1. Mở Bàn 01\n2. Thêm 1 Trà đào\n3. Bấm Chuyển bàn nhưng modal không mở',
        expected: 'Mở TransferModal hiển thị 4 khu vực chuẩn xếp A->Z',
        testCaseId: 'MOD-POS-HP',
        consoleErrors: ['[08:29:55] TypeError: Cannot read properties of undefined'],
        networkErrors: ['[08:29:56] POST /api/pos/transfer -> HTTP 500'],
      },
    ];

    const sampleFailedTests = [
      {
        testCase: MASTER_QA_TEST_CASES[0],
        note: 'Nút Gọi phục vụ bị khuất một nửa trên màn hình iPhone SE 320px',
        severity: 'UI_UX' as const,
        status: 'FAIL' as const,
      },
    ];

    const prompt = formatBugsForAIPrompt(sampleBugs, sampleFailedTests);

    expect(prompt).toContain('YÊU CẦU SỬA LỖI TỪ HỆ THỐNG QA MANUAL TEST (H2MilkTea)');
    expect(prompt).toContain('BUG-99001');
    expect(prompt).toContain('/pos?table=BAN01');
    expect(prompt).toContain('Thu ngân (Trần Tiến)');
    expect(prompt).toContain('1366x768px');
    expect(prompt).toContain('MOD-POS-HP');
    expect(prompt).toContain('TypeError: Cannot read properties of undefined');
    expect(prompt).toContain('POST /api/pos/transfer -> HTTP 500');
    expect(prompt).toContain(MASTER_QA_TEST_CASES[0].id);
    expect(prompt).toContain('File Auto Test bảo vệ:');
    expect(prompt).toContain(
      'Nút Gọi phục vụ bị khuất một nửa trên màn hình iPhone SE 320px'
    );
  });

  it('should have generated both docs/QA_MANUAL_TEST_RUNNER.html and docs/BAO_CAO_TEST_MANUAL_TOAN_DU_AN.md with Hybrid Auto Test integration', () => {
    const htmlPath = path.resolve(process.cwd(), 'docs/QA_MANUAL_TEST_RUNNER.html');
    const mdPath = path.resolve(
      process.cwd(),
      'docs/BAO_CAO_TEST_MANUAL_TOAN_DU_AN.md'
    );

    expect(fs.existsSync(htmlPath)).toBe(true);
    expect(fs.existsSync(mdPath)).toBe(true);

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const mdContent = fs.readFileSync(mdPath, 'utf-8');

    expect(htmlContent).toContain('Auto Tests Bảo Vệ');
    expect(htmlContent).toContain('PART_C_AUTO');
    expect(htmlContent).toContain('Auto-Verified');
    expect(htmlContent).toContain('tests/unit/cart-conflict.test.ts');

    expect(mdContent).toContain('PHẦN C — BÁO CÁO MA TRẬN KIỂM THỬ TỰ ĐỘNG');
    expect(mdContent).toContain('tests/unit/phase-13-rag-and-agent-upgrade.test.ts');
    expect(mdContent).toContain('tests/e2e/h2milktea-e2e.spec.ts');
  });
});
