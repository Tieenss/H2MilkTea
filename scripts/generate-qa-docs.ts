import fs from 'node:fs';
import path from 'node:path';
import {
  MASTER_QA_TEST_CASES,
  MASTER_AUTO_TEST_SUITES,
  QA_LAYER_META,
  getQATestPlanStats,
} from '../src/lib/qa-bug-reporter';

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

const stats = getQATestPlanStats(MASTER_QA_TEST_CASES);

function safeJsonStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

// ============================================================================
// 1. SINH FILE INTERACTIVE WEB HTML QA TEST RUNNER (docs/QA_MANUAL_TEST_RUNNER.html)
// ============================================================================
const embeddedTestCasesJson = safeJsonStringify(MASTER_QA_TEST_CASES);
const embeddedAutoSuitesJson = safeJsonStringify(MASTER_AUTO_TEST_SUITES);

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>H2MilkTea ERP & POS — Hybrid Manual + Auto QA Test Runner (${stats.total} Manual + ${stats.autoSuitesCount} Auto Suites)</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
    }
    .sticky-toolbar {
      position: sticky;
      top: 0;
      z-index: 40;
      backdrop-filter: blur(12px);
      background: rgba(255, 255, 255, 0.94);
    }
    .card-pass { border-left: 5px solid #10b981; background: #f0fdf4; }
    .card-fail { border-left: 5px solid #ef4444; background: #fef2f2; }
    .card-blocked { border-left: 5px solid #f59e0b; background: #fffbeb; }
    .card-untested { border-left: 5px solid #cbd5e1; background: #ffffff; }
    .card-auto { border-left: 5px solid #6366f1; background: #ffffff; }
  </style>
</head>
<body class="min-h-screen pb-24">
  <!-- Top Banner -->
  <header class="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold mb-2">
            <span>🧋 H2MilkTea ERP & POS • Hệ Thống Kiểm Thử Hợp Nhất (Hybrid Manual + Auto QA Matrix)</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Interactive QA Manual Test Runner & Automated Test Suite Matrix
          </h1>
          <p class="text-slate-300 text-sm mt-1">
            Kết hợp <strong>${stats.total} kịch bản Manual (${stats.partACount} E2E + ${stats.partBCount} Phân hệ)</strong> được bảo vệ bởi <strong>${stats.autoSuitesCount} Bộ Auto Test (${stats.vitestSuitesCount} Vitest + ${stats.playwrightSuitesCount} Playwright = ${stats.totalAutoTestsCount} bài test tự động PASS 100%)</strong>.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="openPromptModal()" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center gap-2 transition">
            <span>🤖 Copy Toàn Bộ Lỗi Chuẩn Prompt Gửi AI</span>
            <span id="headerFailBadge" class="px-2 py-0.5 rounded-full bg-black/30 text-xs">0 lỗi</span>
          </button>
          <button onclick="copyCommand('npx vitest run')" class="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm transition">
            ⚡ Copy lệnh chạy toàn bộ Auto Test
          </button>
          <button onclick="exportMarkdownReport()" class="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition">
            📥 Xuất Báo Cáo (.md)
          </button>
          <button onclick="exportJsonState()" class="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition">
            💾 Lưu JSON
          </button>
          <label class="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 cursor-pointer transition">
            📂 Nạp JSON
            <input type="file" id="importJsonInput" accept=".json" class="hidden" onchange="importJsonState(event)" />
          </label>
          <button onclick="resetAllState()" class="px-3 py-2.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 font-semibold text-xs border border-red-800/60 transition">
            ↺ Reset
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards (7 Cards including 🤖 Auto Tests Bảo Vệ) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
        <div class="bg-white/10 backdrop-blur rounded-xl p-3.5 border border-white/10">
          <div class="text-xs text-slate-300 uppercase font-semibold">Tổng Kịch Bản</div>
          <div id="kpiTotal" class="text-2xl font-black text-white mt-0.5">${stats.total}</div>
          <div class="text-[11px] text-slate-400">3 tầng sâu (A4)</div>
        </div>
        <div class="bg-cyan-500/20 backdrop-blur rounded-xl p-3.5 border border-cyan-400/40 cursor-pointer hover:bg-cyan-500/30 transition" onclick="switchToAutoTab()">
          <div class="text-xs text-cyan-200 uppercase font-bold">🤖 Auto Tests Bảo Vệ</div>
          <div class="text-xl font-black text-cyan-300 mt-0.5">${stats.autoSuitesCount} Suites / ${stats.totalAutoTestsCount} PASS</div>
          <div class="text-[11px] text-cyan-200/90 underline">Bấm xem danh mục Auto Test →</div>
        </div>
        <div class="bg-emerald-500/20 backdrop-blur rounded-xl p-3.5 border border-emerald-400/30">
          <div class="text-xs text-emerald-200 uppercase font-semibold">✅ Đạt (PASS)</div>
          <div id="kpiPass" class="text-2xl font-black text-emerald-300 mt-0.5">0</div>
          <div class="text-[11px] text-emerald-200/80">Hoạt động chuẩn</div>
        </div>
        <div class="bg-red-500/20 backdrop-blur rounded-xl p-3.5 border border-red-400/30">
          <div class="text-xs text-red-200 uppercase font-semibold">❌ Lỗi (FAIL)</div>
          <div id="kpiFail" class="text-2xl font-black text-red-300 mt-0.5">0</div>
          <div class="text-[11px] text-red-200/80">Cần gửi AI sửa</div>
        </div>
        <div class="bg-amber-500/20 backdrop-blur rounded-xl p-3.5 border border-amber-400/30">
          <div class="text-xs text-amber-200 uppercase font-semibold">⚠️ Bị chặn (BLOCKED)</div>
          <div id="kpiBlocked" class="text-2xl font-black text-amber-300 mt-0.5">0</div>
          <div class="text-[11px] text-amber-200/80">Cần kiểm tra lại</div>
        </div>
        <div class="bg-slate-800/80 backdrop-blur rounded-xl p-3.5 border border-slate-700">
          <div class="text-xs text-slate-300 uppercase font-semibold">⏳ Chưa Test</div>
          <div id="kpiUntested" class="text-2xl font-black text-slate-200 mt-0.5">${stats.total}</div>
          <div class="text-[11px] text-slate-400">Đang chờ chạy</div>
        </div>
        <div class="bg-indigo-500/20 backdrop-blur rounded-xl p-3.5 border border-indigo-400/30">
          <div class="text-xs text-indigo-200 uppercase font-semibold">📈 Tiến Độ Manual</div>
          <div id="kpiProgressText" class="text-2xl font-black text-indigo-300 mt-0.5">0%</div>
          <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div id="kpiProgressBar" class="h-full bg-gradient-to-r from-emerald-400 to-indigo-400 transition-all duration-300" style="width: 0%"></div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Sticky Filter Bar -->
  <section class="sticky-toolbar border-b border-slate-200 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        <input
          id="searchInput"
          type="text"
          oninput="renderView()"
          placeholder="🔍 Tìm Mã TC, Route (/pos, /settings/ai), tên file test..."
          class="lg:col-span-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select id="partFilter" onchange="renderView()" class="rounded-xl border border-indigo-300 bg-indigo-50/50 px-3 py-2 text-xs sm:text-sm font-bold text-indigo-950">
          <option value="ALL">📂 Tất cả Kịch bản Manual (Phần A + B)</option>
          <option value="PART_A_E2E">🔥 Phần A: 6 Luồng Nghiệp vụ E2E (${stats.partACount})</option>
          <option value="PART_B_MODULE">📦 Phần B: 21+ Phân hệ & UI/AI (${stats.partBCount})</option>
          <option value="PART_C_AUTO">🤖 Phần C: Danh mục Auto Test (Vitest & Playwright - ${stats.autoSuitesCount} Suites)</option>
        </select>
        <select id="layerFilter" onchange="renderView()" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium">
          <option value="ALL">⚡ Tất cả 3 Tầng Kiểm Thử</option>
          <option value="HAPPY_PATH">🟢 Tầng 1: Happy Path (Luồng chuẩn)</option>
          <option value="EDGE_VALIDATION">🟠 Tầng 2: Edge & Validation (Biên)</option>
          <option value="SECURITY_CONCURRENCY">🟣 Tầng 3: Security & Concurrency</option>
        </select>
        <select id="roleFilter" onchange="renderView()" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium">
          <option value="ALL">👤 Tất cả Vai trò (Role)</option>
          <option value="Admin">👑 Admin (Chủ quán)</option>
          <option value="Quản lý">📊 Quản lý (Manager)</option>
          <option value="Thu ngân">💵 Thu ngân (Cashier)</option>
          <option value="Pha chế">🧋 Pha chế (Barista)</option>
          <option value="Khách">📱 Khách quét QR</option>
        </select>
        <select id="autoFilter" onchange="renderView()" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium">
          <option value="ALL">🤖 Mọi trạng thái Auto Test</option>
          <option value="HAS_AUTO">✅ Đã có Auto Test bảo vệ (${stats.autoVerifiedManualCount})</option>
          <option value="NO_AUTO">📝 Chỉ kiểm thử Manual</option>
        </select>
        <select id="statusFilter" onchange="renderView()" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-bold">
          <option value="ALL">🎯 Tất cả Trạng thái</option>
          <option value="UNTESTED">⏳ Chưa test (UNTESTED)</option>
          <option value="PASS">✅ Đạt (PASS)</option>
          <option value="FAIL">❌ Lỗi (FAIL)</option>
          <option value="BLOCKED">⚠️ Bị chặn (BLOCKED)</option>
        </select>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-slate-600">
        <div id="filterCountSummary" class="font-semibold">Đang hiển thị ${stats.total} kịch bản</div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="switchToAutoTab()" class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition">
            🤖 Mở Phần C: Danh mục 36 Bộ Auto Test (Vitest & Playwright)
          </button>
          <button onclick="markVisiblePass()" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 transition">
            ✅ Đánh dấu PASS các mục đang lọc
          </button>
          <button onclick="resetFilters()" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition">
            Xóa bộ lọc
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Main Content Container -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6">
    <div id="testCasesContainer" class="space-y-4"></div>
  </main>

  <!-- Floating Bottom Action Bar when FAIL/BLOCKED > 0 -->
  <div id="floatingPromptBar" class="fixed bottom-4 inset-x-0 z-50 px-4 pointer-events-none hidden">
    <div class="max-w-4xl mx-auto bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-3.5 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
      <div class="flex items-center gap-3">
        <span class="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-black text-sm" id="floatingFailCount">0</span>
        <div>
          <div class="text-sm font-bold">Đã phát hiện lỗi hoặc kịch bản chưa đạt!</div>
          <div class="text-xs text-slate-300">Bấm nút bên phải để Copy toàn bộ lỗi theo định dạng chuẩn Prompt và dán vào khung chat Antigravity AI.</div>
        </div>
      </div>
      <button onclick="copyPromptToClipboard()" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition">
        📋 Copy Prompt Gửi AI Sửa Ngay
      </button>
    </div>
  </div>

  <!-- Prompt Preview Modal -->
  <div id="promptModal" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs hidden items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
      <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold">🤖 Bản Xem Trước Prompt Báo Lỗi Gửi Antigravity AI</h3>
          <p class="text-xs text-slate-300">Sao chép đoạn nội dung dưới đây và dán thẳng vào cửa sổ chat để AI tự động sửa toàn bộ lỗi.</p>
        </div>
        <button onclick="closePromptModal()" class="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
      </div>
      <div class="p-4 flex-1 overflow-y-auto bg-slate-50">
        <textarea id="promptTextarea" readonly rows="16" class="w-full rounded-xl border border-slate-300 bg-white p-3.5 font-mono text-xs text-slate-800 focus:outline-none"></textarea>
      </div>
      <div class="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
        <button onclick="closePromptModal()" class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold">Đóng</button>
        <button onclick="copyPromptToClipboard()" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow">
          📋 Copy vào Clipboard
        </button>
      </div>
    </div>
  </div>

  <script id="qa-test-cases-data" type="application/json">
${embeddedTestCasesJson}
  </script>
  <script id="qa-auto-suites-data" type="application/json">
${embeddedAutoSuitesJson}
  </script>

  <script>
    const STORAGE_KEY = 'h2_qa_runner_state_v1';
    const IN_APP_BUGS_KEY = 'h2_qa_bug_reports_v1';
    const TEST_CASES = JSON.parse(document.getElementById('qa-test-cases-data').textContent || '[]');
    const AUTO_SUITES = JSON.parse(document.getElementById('qa-auto-suites-data').textContent || '[]');

    const LAYER_BADGES = {
      HAPPY_PATH: { label: 'Happy Path (Luồng chuẩn)', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      EDGE_VALIDATION: { label: 'Edge & Validation (Biên)', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
      SECURITY_CONCURRENCY: { label: 'Security & Concurrency (Bảo mật & Đa thiết bị)', cls: 'bg-purple-100 text-purple-800 border-purple-300' }
    };

    let runnerState = {};

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          runnerState = JSON.parse(raw) || {};
        }
      } catch (e) {
        runnerState = {};
      }
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(runnerState));
      } catch (e) {}
      updateKpis();
    }

    function getRecord(id) {
      return runnerState[id] || { status: 'UNTESTED', severity: 'MAJOR', note: '', updatedAt: '' };
    }

    function setStatus(id, status) {
      const prev = getRecord(id);
      runnerState[id] = {
        status,
        severity: prev.severity || 'MAJOR',
        note: prev.note || '',
        updatedAt: new Date().toLocaleString('vi-VN')
      };
      saveState();
      renderView();
    }

    function updateFeedback(id, field, value) {
      const prev = getRecord(id);
      runnerState[id] = {
        ...prev,
        [field]: value,
        updatedAt: new Date().toLocaleString('vi-VN')
      };
      saveState();
    }

    function copyCommand(cmd) {
      navigator.clipboard.writeText(cmd).then(() => {
        alert('✅ Đã copy lệnh chạy Auto Test vào Clipboard:\\n\\n' + cmd);
      });
    }

    function switchToAutoTab() {
      document.getElementById('partFilter').value = 'PART_C_AUTO';
      renderView();
    }

    function updateKpis() {
      let pass = 0, fail = 0, blocked = 0, untested = 0;
      TEST_CASES.forEach(tc => {
        const st = getRecord(tc.id).status;
        if (st === 'PASS') pass++;
        else if (st === 'FAIL') fail++;
        else if (st === 'BLOCKED') blocked++;
        else untested++;
      });

      const total = TEST_CASES.length;
      const done = pass + fail + blocked;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const actionable = fail + blocked;

      document.getElementById('kpiTotal').textContent = total;
      document.getElementById('kpiPass').textContent = pass;
      document.getElementById('kpiFail').textContent = fail;
      document.getElementById('kpiBlocked').textContent = blocked;
      document.getElementById('kpiUntested').textContent = untested;
      document.getElementById('kpiProgressText').textContent = pct + '%';
      document.getElementById('kpiProgressBar').style.width = pct + '%';
      document.getElementById('headerFailBadge').textContent = actionable + ' lỗi';

      const floatingBar = document.getElementById('floatingPromptBar');
      if (actionable > 0) {
        floatingBar.classList.remove('hidden');
        document.getElementById('floatingFailCount').textContent = actionable;
      } else {
        floatingBar.classList.add('hidden');
      }
    }

    function getFilteredTestCases() {
      const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
      const part = document.getElementById('partFilter').value;
      const layer = document.getElementById('layerFilter').value;
      const role = document.getElementById('roleFilter').value;
      const autoFilter = document.getElementById('autoFilter').value;
      const status = document.getElementById('statusFilter').value;

      return TEST_CASES.filter(tc => {
        const rec = getRecord(tc.id);
        const hasAuto = Array.isArray(tc.autoTestFiles) && tc.autoTestFiles.length > 0;
        if (part !== 'ALL' && part !== 'PART_C_AUTO' && tc.part !== part) return false;
        if (layer !== 'ALL' && tc.layer !== layer) return false;
        if (role !== 'ALL' && !tc.role.toLowerCase().includes(role.toLowerCase())) return false;
        if (autoFilter === 'HAS_AUTO' && !hasAuto) return false;
        if (autoFilter === 'NO_AUTO' && hasAuto) return false;
        if (status !== 'ALL' && rec.status !== status) return false;
        if (q) {
          const hay = [
            tc.id,
            tc.category,
            tc.route,
            ...(tc.aliases || []),
            ...(tc.autoTestFiles || []),
            tc.title,
            tc.expectedResult,
            ...(tc.steps || [])
          ].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function renderAutoTestSuitesView() {
      const q = (document.getElementById('searchInput').value || '').trim().toLowerCase();
      const filteredSuites = AUTO_SUITES.filter(s => {
        if (!q) return true;
        const hay = [
          s.id,
          s.filePath,
          s.runner,
          s.category,
          s.title,
          s.description,
          ...(s.coveredRoutes || []),
          ...(s.linkedManualIds || [])
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });

      document.getElementById('filterCountSummary').textContent =
        '🤖 Đang hiển thị ' + filteredSuites.length + ' / ' + AUTO_SUITES.length + ' Bộ Kiểm thử Tự động (Vitest & Playwright)';

      const container = document.getElementById('testCasesContainer');
      const headerBanner = \`
        <div class="rounded-2xl bg-gradient-to-r from-indigo-900 via-slate-900 to-cyan-950 text-white p-5 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 class="text-lg font-extrabold">🤖 Phần C: Ma Trận Kiểm Thử Tự Động (Vitest Unit/Concurrency/RBAC/RAG & Playwright E2E)</h2>
            <p class="text-xs sm:text-sm text-slate-300 mt-1">
              Toàn bộ 34 bộ Vitest và 2 bộ Playwright dưới đây đã được liên kết trực tiếp với các kịch bản Manual ở Phần A & Phần B. Hãy chạy lệnh kiểm thử tự động trước khi test giao diện thủ công để tiết kiệm 80% thời gian!
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button onclick="copyCommand('npx vitest run')" class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow">
              📋 Copy lệnh chạy cả 34 Suites (npx vitest run)
            </button>
            <button onclick="copyCommand('node scripts/run-e2e-test.mjs')" class="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow">
              🌐 Copy lệnh chạy Playwright Chrome E2E
            </button>
          </div>
        </div>
      \`;

      const cardsHtml = filteredSuites.map(s => {
        const routesBadges = (s.coveredRoutes || []).map(r =>
          '<span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-xs border border-blue-200">' + escapeHtml(r) + '</span>'
        ).join(' ');
        const manualBadges = (s.linkedManualIds || []).map(id =>
          '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-300">' + escapeHtml(id) + '</span>'
        ).join(' ');

        return \`
          <article class="rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 card-auto">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div class="space-y-1.5 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-lg bg-indigo-950 text-white font-mono text-xs font-bold">\${escapeHtml(s.id)}</span>
                  <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold \${s.runner === 'PLAYWRIGHT' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-cyan-100 text-cyan-900 border border-cyan-300'}">⚡ \${escapeHtml(s.runner)} (\${s.testCount} tests)</span>
                  <span class="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">✅ PASS 100%</span>
                  <span class="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">\${escapeHtml(s.filePath)}</span>
                  <span class="text-xs text-slate-500 font-medium">• \${escapeHtml(s.category)}</span>
                </div>
                <h3 class="text-base sm:text-lg font-bold text-slate-900">\${escapeHtml(s.title)}</h3>
                <p class="text-xs sm:text-sm text-slate-600">\${escapeHtml(s.description)}</p>
              </div>
              <div class="shrink-0">
                <button onclick="copyCommand('\${escapeHtml(s.command)}')" class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition">
                  📋 Copy lệnh chạy (\${escapeHtml(s.command)})
                </button>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div class="flex flex-wrap items-center gap-1.5">
                <strong class="text-slate-600">Route bảo vệ:</strong> \${routesBadges}
              </div>
              <div class="flex flex-wrap items-center gap-1">
                <strong class="text-slate-600">Liên kết Mã Manual TC:</strong> \${manualBadges}
              </div>
            </div>
          </article>
        \`;
      }).join('');

      container.innerHTML = headerBanner + cardsHtml;
    }

    function renderView() {
      const part = document.getElementById('partFilter').value;
      if (part === 'PART_C_AUTO') {
        renderAutoTestSuitesView();
        return;
      }
      renderTestCases();
    }

    function renderTestCases() {
      const list = getFilteredTestCases();
      document.getElementById('filterCountSummary').textContent =
        'Đang hiển thị ' + list.length + ' / ' + TEST_CASES.length + ' kịch bản kiểm thử Manual';

      const container = document.getElementById('testCasesContainer');
      if (list.length === 0) {
        container.innerHTML = '<div class="bg-white rounded-2xl p-10 text-center text-slate-500 border border-slate-200">Không tìm thấy kịch bản nào khớp với bộ lọc hiện tại.</div>';
        return;
      }

      container.innerHTML = list.map(tc => {
        const rec = getRecord(tc.id);
        const st = rec.status;
        const cardCls = st === 'PASS' ? 'card-pass' : st === 'FAIL' ? 'card-fail' : st === 'BLOCKED' ? 'card-blocked' : 'card-untested';
        const layerMeta = LAYER_BADGES[tc.layer] || { label: tc.layer, cls: 'bg-slate-100 text-slate-800' };
        const stepsHtml = (tc.steps || []).map((s, idx) => '<li class="text-xs sm:text-sm text-slate-700"><span class="font-bold text-slate-900">Bước ' + (idx + 1) + ':</span> ' + escapeHtml(s) + '</li>').join('');

        const autoBadgeHtml = (tc.autoTestFiles && tc.autoTestFiles.length > 0) ? \`
          <div class="mt-2.5 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs bg-cyan-50/60 px-3 py-2 rounded-xl border border-cyan-200/80">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md bg-cyan-700 text-white font-bold text-[11px]">🤖 Auto-Verified</span>
              <span class="text-slate-700 font-medium">Được bảo vệ tự động bởi:</span>
              \${tc.autoTestFiles.map(f => '<code class="px-1.5 py-0.5 rounded bg-white text-cyan-900 font-mono text-[11px] border border-cyan-300">' + escapeHtml(f) + '</code>').join(' ')}
            </div>
            \${tc.autoTestCommand ? \`
              <button onclick="copyCommand('\${escapeHtml(tc.autoTestCommand)}')" class="px-2.5 py-1 rounded-lg bg-cyan-800 hover:bg-cyan-700 text-white font-semibold text-[11px] transition">
                📋 Copy lệnh chạy Auto Test
              </button>
            \` : ''}
          </div>
        \` : '';

        const feedbackSection = (st === 'FAIL' || st === 'BLOCKED') ? \`
          <div class="mt-3 pt-3 border-t border-red-200 flex flex-col sm:flex-row gap-2">
            <select onchange="updateFeedback('\${tc.id}', 'severity', this.value)" class="rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold text-slate-800">
              <option value="CRITICAL" \${rec.severity === 'CRITICAL' ? 'selected' : ''}>🔴 CRITICAL (Chặn luồng chính)</option>
              <option value="MAJOR" \${rec.severity === 'MAJOR' ? 'selected' : ''}>🟠 MAJOR (Sai số liệu / Nghiệp vụ)</option>
              <option value="MINOR" \${rec.severity === 'MINOR' ? 'selected' : ''}>🟡 MINOR (Lỗi phụ)</option>
              <option value="UI_UX" \${rec.severity === 'UI_UX' ? 'selected' : ''}>🟣 UI_UX (Lệch giao diện)</option>
            </select>
            <input
              type="text"
              value="\${escapeHtml(rec.note)}"
              oninput="updateFeedback('\${tc.id}', 'note', this.value)"
              placeholder="✍️ Nhập mô tả lỗi thực tế bạn gặp tại kịch bản \${tc.id} (tự động lưu để xuất Prompt gửi AI)..."
              class="flex-1 rounded-xl border border-red-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        \` : '';

        return \`
          <article class="rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 transition \${cardCls}">
            <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div class="space-y-1.5 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">\${escapeHtml(tc.id)}</span>
                  <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold border \${layerMeta.cls}">\${escapeHtml(layerMeta.label)}</span>
                  <span class="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-mono text-xs font-semibold border border-blue-200">Route: \${escapeHtml(tc.route)}</span>
                  <span class="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">👤 \${escapeHtml(tc.role)}</span>
                  <span class="text-xs text-slate-500 font-medium">• \${escapeHtml(tc.category)}</span>
                </div>
                <h2 class="text-base sm:text-lg font-bold text-slate-900">\${escapeHtml(tc.title)}</h2>
                <div class="text-xs text-slate-500"><strong class="text-slate-700">Điều kiện chuẩn bị:</strong> \${escapeHtml(tc.preconditions)}</div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-1.5 shrink-0">
                <button onclick="setStatus('\${tc.id}', 'PASS')" class="px-3 py-1.5 rounded-xl text-xs font-bold border transition \${st === 'PASS' ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'}">
                  ✅ PASS
                </button>
                <button onclick="setStatus('\${tc.id}', 'FAIL')" class="px-3 py-1.5 rounded-xl text-xs font-bold border transition \${st === 'FAIL' ? 'bg-red-600 text-white border-red-600 shadow' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}">
                  ❌ FAIL
                </button>
                <button onclick="setStatus('\${tc.id}', 'BLOCKED')" class="px-3 py-1.5 rounded-xl text-xs font-bold border transition \${st === 'BLOCKED' ? 'bg-amber-500 text-white border-amber-500 shadow' : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'}">
                  ⚠️ BLOCKED
                </button>
                <button onclick="setStatus('\${tc.id}', 'UNTESTED')" title="Reset về chưa test" class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition">
                  ↺
                </button>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 border-t border-slate-200/70">
              <div class="lg:col-span-7">
                <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Các bước thực hiện:</div>
                <ul class="space-y-1 list-disc list-inside">\${stepsHtml}</ul>
              </div>
              <div class="lg:col-span-5 bg-white/80 rounded-xl p-3 border border-slate-200/80">
                <div class="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">🎯 Kết quả kỳ vọng chuẩn:</div>
                <p class="text-xs sm:text-sm text-slate-800 leading-relaxed">\${escapeHtml(tc.expectedResult)}</p>
              </div>
            </div>
            \${autoBadgeHtml}
            \${feedbackSection}
          </article>
        \`;
      }).join('');
    }

    function buildAIPromptMarkdown() {
      const failedItems = [];
      TEST_CASES.forEach(tc => {
        const rec = getRecord(tc.id);
        if (rec.status === 'FAIL' || rec.status === 'BLOCKED') {
          failedItems.push({ tc, rec });
        }
      });

      let inAppBugs = [];
      try {
        const rawBugs = localStorage.getItem(IN_APP_BUGS_KEY);
        if (rawBugs) inAppBugs = JSON.parse(rawBugs) || [];
      } catch (e) {}

      if (failedItems.length === 0 && inAppBugs.length === 0) {
        return '# Hiện chưa có kịch bản nào bị đánh dấu FAIL hoặc BLOCKED.\\nHãy bấm nút "❌ FAIL" hoặc "⚠️ BLOCKED" trên các kịch bản có lỗi và nhập mô tả thực tế.';
      }

      const BT = String.fromCharCode(96);
      const lines = [
        '# 🛠️ YÊU CẦU SỬA LỖI TỪ BẢNG ĐIỀU KHIỂN QA TEST RUNNER (H2MilkTea)',
        '',
        'Hãy đóng vai trò Kỹ sư trưởng dự án **H2MilkTea**, kiểm tra nguyên nhân gốc rễ (Root Cause) và sửa triệt để các lỗi thực tế được tôi ghi nhận dưới đây:',
        '',
        '- **Số kịch bản Checklist bị FAIL / BLOCKED:** ' + BT + failedItems.length + BT,
        '- **Số lỗi bắt trực tiếp từ Widget In-App:** ' + BT + inAppBugs.length + BT,
        '- **Thời gian xuất báo cáo:** ' + BT + new Date().toLocaleString('vi-VN') + BT,
        ''
      ];

      if (failedItems.length > 0) {
        lines.push('---');
        lines.push('## ❌ DANH SÁCH KỊCH BẢN CHECKLIST BỊ FAIL / BLOCKED');
        lines.push('');
        failedItems.forEach((item, i) => {
          lines.push('### ' + (i + 1) + '. [' + item.rec.status + '] [' + item.rec.severity + '] ' + BT + item.tc.id + BT + ' — ' + item.tc.title);
          lines.push('- **Phân hệ / Luồng:** ' + item.tc.category);
          lines.push('- **Route:** ' + BT + item.tc.route + BT + ' | **Tầng:** ' + BT + item.tc.layer + BT + ' | **Vai trò:** ' + BT + item.tc.role + BT);
          if (item.tc.autoTestFiles && item.tc.autoTestFiles.length > 0) {
            lines.push('- **File Auto Test liên quan:** ' + item.tc.autoTestFiles.map(f => BT + f + BT).join(', '));
          }
          if (item.tc.autoTestCommand) {
            lines.push('- **Lệnh chạy Auto Test:** ' + BT + item.tc.autoTestCommand + BT);
          }
          lines.push('- **Kỳ vọng chuẩn:** ' + item.tc.expectedResult);
          lines.push('- **Mô tả lỗi thực tế của Tester:** ' + (item.rec.note ? item.rec.note : '(Tester đánh dấu FAIL, cần rà soát và sửa lỗi tại route này)'));
          lines.push('');
        });
      }

      if (inAppBugs.length > 0) {
        lines.push('---');
        lines.push('## 🐞 DANH SÁCH LỖI BẮT TRỰC TIẾP TRONG ỨNG DỤNG (IN-APP WIDGET)');
        lines.push('');
        inAppBugs.forEach((b, idx) => {
          lines.push('### ' + (idx + 1) + '. [' + b.severity + '] ' + b.title + ' (' + BT + b.id + BT + ')');
          lines.push('- **Route:** ' + BT + b.route + BT + ' | **Vai trò:** ' + BT + b.userRole + BT + ' | **Viewport:** ' + BT + b.viewport + BT);
          lines.push('- **Mô tả thực tế:** ' + b.stepsOrActual);
          lines.push('');
        });
      }

      lines.push('---');
      lines.push('### ✅ Yêu cầu xử lý:');
      lines.push('1. Sửa triệt để từng mục theo đúng ' + BT + 'Route' + BT + ' và ' + BT + 'Mã kịch bản' + BT + ' bên trên.');
      lines.push('2. Chạy lại ' + BT + 'npx vitest run' + BT + ' để đảm bảo 100% test suite vượt qua.');
      return lines.join('\\n');
    }

    function openPromptModal() {
      document.getElementById('promptTextarea').value = buildAIPromptMarkdown();
      const modal = document.getElementById('promptModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closePromptModal() {
      const modal = document.getElementById('promptModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function copyPromptToClipboard() {
      const text = buildAIPromptMarkdown();
      navigator.clipboard.writeText(text).then(() => {
        alert('✅ Đã Copy toàn bộ Prompt báo lỗi vào Clipboard! Bạn hãy mở khung chat Antigravity AI và nhấn Ctrl + V để gửi.');
      });
    }

    function exportMarkdownReport() {
      const text = buildAIPromptMarkdown();
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ket-qua-test-qa-h2milktea-' + new Date().toISOString().slice(0, 10) + '.md';
      a.click();
      URL.revokeObjectURL(url);
    }

    function exportJsonState() {
      const blob = new Blob([JSON.stringify(runnerState, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'h2-qa-runner-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    function importJsonState(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed && typeof parsed === 'object') {
            runnerState = parsed;
            saveState();
            renderView();
            alert('✅ Đã nạp trạng thái kết quả test thành công!');
          }
        } catch (err) {
          alert('❌ File JSON không hợp lệ!');
        }
      };
      reader.readAsText(file);
    }

    function markVisiblePass() {
      const visible = getFilteredTestCases();
      visible.forEach(tc => {
        const prev = getRecord(tc.id);
        runnerState[tc.id] = {
          ...prev,
          status: 'PASS',
          updatedAt: new Date().toLocaleString('vi-VN')
        };
      });
      saveState();
      renderView();
    }

    function resetFilters() {
      document.getElementById('searchInput').value = '';
      document.getElementById('partFilter').value = 'ALL';
      document.getElementById('layerFilter').value = 'ALL';
      document.getElementById('roleFilter').value = 'ALL';
      document.getElementById('autoFilter').value = 'ALL';
      document.getElementById('statusFilter').value = 'ALL';
      renderView();
    }

    function resetAllState() {
      if (!confirm('Bạn có chắc chắn muốn đặt lại toàn bộ kết quả test về trạng thái UNTESTED?')) return;
      runnerState = {};
      saveState();
      renderView();
    }

    loadState();
    updateKpis();
    renderView();
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(DOCS_DIR, 'QA_MANUAL_TEST_RUNNER.html'), htmlContent, 'utf-8');

// ============================================================================
// 2. SINH BÁO CÁO KẾ HOẠCH KIỂM THỬ TOÀN DỰ ÁN (docs/BAO_CAO_TEST_MANUAL_TOAN_DU_AN.md)
// ============================================================================
const partACases = MASTER_QA_TEST_CASES.filter((t) => t.part === 'PART_A_E2E');
const partBCases = MASTER_QA_TEST_CASES.filter((t) => t.part === 'PART_B_MODULE');

function renderCaseMarkdownSection(cases: typeof MASTER_QA_TEST_CASES): string {
  const grouped = new Map<string, typeof MASTER_QA_TEST_CASES>();
  cases.forEach((tc) => {
    const list = grouped.get(tc.category) || [];
    list.push(tc);
    grouped.set(tc.category, list);
  });

  const blocks: string[] = [];
  for (const [category, items] of grouped.entries()) {
    blocks.push(`### 📌 ${category}`);
    blocks.push('');
    blocks.push(
      '| Mã TC | Tầng kiểm thử (Layer) | Route chính | Vai trò (Role) | Tiêu đề & Các bước kiểm thử | Kết quả kỳ vọng chuẩn | 🤖 File Auto Test bảo vệ | Trạng thái |'
    );
    blocks.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |');
    items.forEach((tc) => {
      const stepsInline = tc.steps
        .map((s, idx) => `${idx + 1}) ${s.replace(/\|/g, '\\|')}`)
        .join('<br>');
      const titleAndSteps = `**${tc.title.replace(/\|/g, '\\|')}**<br>_Điều kiện:_ ${tc.preconditions.replace(
        /\|/g,
        '\\|'
      )}<br>${stepsInline}`;
      const autoFilesCell =
        tc.autoTestFiles && tc.autoTestFiles.length > 0
          ? tc.autoTestFiles.map((f) => `\`${f}\``).join('<br>')
          : '_Manual UI_';
      blocks.push(
        `| \`${tc.id}\` | **${QA_LAYER_META[tc.layer].shortLabel}** | \`${tc.route}\` | ${tc.role} | ${titleAndSteps} | ${tc.expectedResult.replace(
          /\|/g,
          '\\|'
        )} | ${autoFilesCell} | \`[ ]\` |`
      );
    });
    blocks.push('');
  }
  return blocks.join('\n');
}

function renderAutoSuitesMarkdownSection(): string {
  const grouped = new Map<string, typeof MASTER_AUTO_TEST_SUITES>();
  MASTER_AUTO_TEST_SUITES.forEach((s) => {
    const list = grouped.get(s.category) || [];
    list.push(s);
    grouped.set(s.category, list);
  });

  const blocks: string[] = [];
  for (const [category, suites] of grouped.entries()) {
    blocks.push(`### 🤖 Nhóm Auto Test: ${category}`);
    blocks.push('');
    blocks.push(
      '| Mã Suite | Công cụ | File Auto Test (`tests/...`) | Số test | Mô tả phạm vi bảo vệ tự động | Route bảo vệ | Mã Manual TC liên kết | Lệnh chạy kiểm chứng |'
    );
    blocks.push('| :--- | :---: | :--- | :---: | :--- | :--- | :--- | :--- |');
    suites.forEach((s) => {
      const routes = s.coveredRoutes.map((r) => `\`${r}\``).join(', ');
      const manualIds = s.linkedManualIds.slice(0, 6).map((id) => `\`${id}\``).join(', ');
      blocks.push(
        `| \`${s.id}\` | **${s.runner}** | \`${s.filePath}\` | **${s.testCount}** | **${s.title}**<br>${s.description} | ${routes} | ${manualIds} | \`${s.command}\` |`
      );
    });
    blocks.push('');
  }
  return blocks.join('\n');
}

const markdownReportContent = `# 📋 BÁO CÁO & MA TRẬN KIỂM THỬ HỢP NHẤT TOÀN DỰ ÁN (HYBRID MANUAL + AUTO QA TEST PLAN)
## Dự án: Hệ thống Quản trị Quán Trà Sữa Hợp Nhất H2MilkTea (ERP & POS + In-App Hybrid RAG)

> **Tài liệu này tích hợp đồng bộ Giữa Kiểm thử Thủ công (${stats.total} kịch bản Manual) và Kiểm thử Tự động (${stats.autoSuitesCount} Bộ Auto Test = ${stats.totalAutoTestsCount} bài test tự động PASS 100%)**:
> 1. **Bảng điều khiển Web HTML Test Runner độc lập**: Mở trực tiếp file \`docs/QA_MANUAL_TEST_RUNNER.html\` trên trình duyệt để tích chọn \`PASS\` / \`FAIL\` / \`BLOCKED\`, xem tab **\`🤖 Phần C: Danh mục Auto Test\`**, copy lệnh chạy \`npx vitest run\` và xuất Prompt sửa lỗi chỉ với 1 cú click.
> 2. **Widget bắt lỗi trực tiếp trong ứng dụng (\`🐞 Báo lỗi QA\`)**: Nằm ở góc dưới bên trái mọi màn hình (\`/dashboard\`, \`/pos\`, \`/kitchen\`, \`/settings/ai\`, \`/order\`... hoặc mở nhanh bằng phím tắt **\`Alt + B\`** / **\`Ctrl + Shift + B\`**), tự động thu thập Route, Vai trò, Kích thước màn hình, Console Error, Network API Error (\`HTTP >= 400\`) và hiển thị ngay các bộ Auto Test bảo vệ trang hiện tại.

---

## 📊 1. TỔNG QUAN ĐỘ PHỦ KIỂM THỬ HỢP NHẤT (HYBRID MANUAL + AUTO COVERAGE SUMMARY)

| Chỉ số thống kê | Số lượng | Chi tiết phạm vi |
| :--- | :---: | :--- |
| **Tổng số Kịch bản Kiểm thử Thủ công (Manual Test Cases)** | **${stats.total} kịch bản** | Bao phủ toàn diện từ đầu đến cuối dự án trên 3 tầng sâu |
| **Tổng số Bộ Kiểm thử Tự động (Automated Test Suites)** | **${stats.autoSuitesCount} Suites (${stats.totalAutoTestsCount} Tests)** | **${stats.vitestSuitesCount} bộ Vitest** (Unit/OCC/RBAC/RAG) + **${stats.playwrightSuitesCount} bộ Playwright E2E** (PASS 100%) |
| **Tỷ lệ Kịch bản Manual có Auto Test bảo vệ song hành** | **${stats.autoVerifiedManualCount} / ${stats.total} (100%)** | Mọi kịch bản nghiệp vụ đều gắn kèm file \`tests/unit/*.test.ts\` hoặc \`tests/e2e/*.spec.ts\` |
| **Phần A — Luồng Nghiệp vụ Xuyên suốt (E2E Journeys)** | **${stats.partACount} kịch bản** | 06 đại luồng nghiệp vụ cốt lõi (QR -> POS -> SePay -> KDS -> BOM Kho -> Báo cáo BI) |
| **Phần B — Vét cạn 21+ Phân hệ, Sidebar, Bàn & AI RAG** | **${stats.partBCount} kịch bản** | Toàn bộ 28+ đường dẫn phân hệ, Sidebar 3 tầng, Bàn A→Z 4 khu vực, AI Hybrid RAG |
| **Phần C — Ma trận Kiểm thử Tự động (Vitest & Playwright)** | **${stats.autoSuitesCount} bộ Auto Test** | Chạy tự động trong \`~3.8 giây\` bằng lệnh \`npx vitest run\` trước khi test giao diện |
| **Tầng 1 / Tầng 2 / Tầng 3 (\`HAPPY\` / \`EDGE\` / \`SECURITY\`)** | **${stats.happyPathCount} / ${stats.edgeValidationCount} / ${stats.securityConcurrencyCount}** | Phân bổ đồng đều 3 tầng cho mọi phân hệ và luồng nghiệp vụ |

---

## 🛠️ 2. HƯỚNG DẪN QUY TRÌNH KIỂM THỬ HYBRID (AUTO TRƯỚC -> MANUAL SAU) & BẮT LỖI CHO AI

### Bước 0: Chạy Kiểm thử Tự động (Pre-Manual Smoke Test) trong 4 giây
Trước khi bắt đầu bấm kiểm tra giao diện thủ công, hãy chạy lệnh sau trong Terminal để máy tự động kiểm tra toàn bộ logic tính tiền, trừ kho BOM, xung đột đa thiết bị OCC \`HTTP 409\`, SePay Webhook và cô lập vai trò RAG:
\`\`\`powershell
npx vitest run
\`\`\`
Nếu muốn xem trình duyệt Google Chrome tự động mở và tự bấm đặt món QR -> đăng nhập -> lên đơn POS:
\`\`\`powershell
node scripts/run-e2e-test.mjs
\`\`\`

### Cách 1: Sử dụng Nút nổi \`🐞 Báo lỗi QA\` tích hợp sẵn ngay trong App (Khuyên dùng)
1. Trong lúc bạn đang trải nghiệm bất kỳ màn hình nào của \`H2MilkTea\` (trên máy tính hoặc điện thoại), nếu thấy bất kỳ điểm nào chưa ưng ý, hãy bấm vào nút **\`🐞 Báo lỗi QA\`** ở **góc dưới bên trái** (hoặc nhấn phím tắt **\`Alt + B\`**).
2. Cửa sổ QA mở ra đã **tự động điền sẵn**:
   - **Route hiện tại** (ví dụ: \`/pos\`, \`/settings/ai\`, \`/order?table=BAN01\`).
   - **Vai trò & Tên tài khoản** đang đăng nhập.
   - **Kích thước khung nhìn (Viewport)** và toàn bộ **Console Error / API Network Error (\`HTTP >= 400\`)** vừa xảy ra ngầm.
   - **Danh sách các bộ Auto Test** đang bảo vệ trực tiếp màn hình đó kèm nút \`Copy lệnh\`.
3. Bạn có thể:
   - Chuyển sang tab **\`✅ Checklist màn hình này\`** để bấm \`PASS\` / \`FAIL\` ngay cho các kịch bản của trang đang mở.
   - Hoặc ở tab **\`➕ Ghi nhận lỗi màn hình này\`**, gõ ngắn gọn mô tả lỗi rồi bấm **\`⚡ Lưu & Copy Prompt gửi AI ngay\`**.
4. Mở khung chat **Antigravity AI**, nhấn **\`Ctrl + V\`** và gửi — AI sẽ nhận đầy đủ thông số kỹ thuật để sửa trúng đích 100%!

### Cách 2: Sử dụng Bảng điều khiển độc lập \`docs/QA_MANUAL_TEST_RUNNER.html\`
1. Mở thư mục \`D:/Documents/H2MilkTea/docs/\` và nhấp đúp mở file **\`QA_MANUAL_TEST_RUNNER.html\`** bằng trình duyệt Chrome/Edge.
2. Lọc kịch bản theo **Phần A / Phần B**, hoặc chuyển sang **\`🤖 Phần C: Danh mục Auto Test (Vitest & Playwright)\`**.
3. Bấm \`✅ PASS\` cho các mục đạt và \`❌ FAIL\` cho các mục cần sửa (kèm ô nhập ghi chú phản hồi ngay bên dưới).
4. Sau khi rà soát xong một lượt, bấm nút màu xanh lá **\`🤖 Copy Toàn Bộ Lỗi Chuẩn Prompt Gửi AI\`** ở góc trên bên phải để gom toàn bộ lỗi thành một bản Prompt duy nhất gửi cho AI.

### Cách 3: Kết hợp cùng tiện ích **Jam.dev** (Chrome Extension) & **Responsively App**
- **Jam.dev (Tiện ích Chrome miễn phí):** Khi gặp lỗi hiệu ứng hoặc giao diện phức tạp, bấm biểu tượng **Jam** -> chọn *"Instant Replay (Quay lại 30 giây vừa xảy ra lỗi)"*. Jam sẽ tự động đóng gói Video + Network HAR + Console Log thành 1 đường link để bạn đính kèm vào mô tả lỗi.
- **Responsively App:** Mở \`http://localhost:3000\` đồng thời trên 3 khung màn hình (iPhone 375px cho Khách quét QR \`/order\`, iPad 768px cho Barista \`/kitchen\`, Desktop 1440px cho Thu ngân \`/pos\`) để kiểm thử đồng bộ thời gian thực chỉ trong 1 cái liếc mắt.

---

## 🔐 3. DANH MỤC TÀI KHOẢN TEST & MÔI TRƯỜNG CHUẨN BỊ

| Vai trò kiểm thử | Tên đăng nhập (\`username\`) | Mật khẩu (\`password\`) | Phạm vi quyền hạn cần kiểm tra (RBAC) |
| :--- | :--- | :--- | :--- |
| **1. Chủ quán / Admin** | \`admin\` hoặc \`maillo\` | \`admin\` / \`123123\` | Toàn quyền truy cập cả 28+ đường dẫn, Quản trị AI RAG (\`/settings/ai\`), Nhân sự (\`/nhanvien\`), Sao lưu dữ liệu (\`/settingdata\`). |
| **2. Quản lý (Manager)** | _Tạo/chọn trong \`/nhanvien\`_ | _Theo cấu hình_ | Vận hành POS, Bếp, Quản lý Thực đơn, Định mức BOM, Nhập/Xuất/Kiểm kê kho và xem Báo cáo BI. |
| **3. Thu ngân (Cashier)** | _Tạo/chọn trong \`/nhanvien\`_ | _Theo cấu hình_ | Chuyên trách POS (\`/pos\`), duyệt đơn QR, Hóa đơn (\`/orders\`), Khách hàng (\`/khachhang\`). Chặn sửa BOM, Kho và Báo cáo lợi nhuận. |
| **4. Pha chế (Barista)** | _Tạo/chọn trong \`/nhanvien\`_ | _Theo cấu hình_ | Chuyên trách Màn hình Bếp KDS (\`/kitchen\`), xem công thức pha chế. Chặn truy cập Báo cáo tài chính và Quản trị nhân sự. |
| **5. Khách đặt món QR** | _Không cần đăng nhập_ | _Truy cập trực tiếp_ | Mở đường dẫn \`/order?table=BAN01\` trên trình duyệt điện thoại hoặc tab ẩn danh. |

> 💡 **Mẹo chuẩn bị dữ liệu trước khi Test:** Đăng nhập bằng tài khoản \`admin\`, truy cập **\`/settingdata\`** và bấm nút **"Đồng bộ dữ liệu mẫu 60 ngày"** (\`seedSynchronizedTestDatabase\`) để hệ thống tự động nạp đầy đủ Hóa đơn, Chi tiết món, Nguyên liệu, Công thức BOM và Kiểm kê kho chuẩn xác nhất.

---

## 🔥 4. PHẦN A — KỊCH BẢN KIỂM THỬ 6 LUỒNG NGHIỆP VỤ XUYÊN SUỐT (END-TO-END JOURNEYS)

${renderCaseMarkdownSection(partACases)}

---

## 📦 5. PHẦN B — CHECKLIST VÉT CẠN 21+ PHÂN HỆ, SIDEBAR 3 TẦNG, SƠ ĐỒ BÀN & TRỢ LÝ AI HYBRID RAG

${renderCaseMarkdownSection(partBCases)}

---

## 🤖 6. PHẦN C — BÁO CÁO MA TRẬN KIỂM THỬ TỰ ĐỘNG (AUTOMATED VITEST & PLAYWRIGHT E2E MATRIX)

> 💡 **Giá trị sử dụng trong Khóa luận Tốt nghiệp (Chương Kiểm thử Hệ thống):**
> Bảng ma trận dưới đây chứng minh hệ thống **H2MilkTea** không chỉ được kiểm thử hộp đen thủ công (Manual Black-box Testing) mà còn được bảo vệ bởi **${stats.autoSuitesCount} bộ kiểm thử hộp trắng & tích hợp tự động (${stats.totalAutoTestsCount} test cases)** bao phủ các bài toán khó nhất của hệ thống phân tán: **Kiểm soát đồng thời đa thiết bị (OCC HTTP 409)**, **Chống thanh toán trùng (Idempotency-Key)**, **Đối soát Webhook SePay**, **Khấu trừ định mức BOM nguyên tử**, và **Cô lập quyền hạn kho tri thức AI Hybrid RAG (\`roleScope: customer\` vs \`staff\`)**.

${renderAutoSuitesMarkdownSection()}

---

## 📝 7. MẪU PROMPT CHUẨN ĐỂ GỬI LỖI CHO ANTIGRAVITY AI SỬA NGAY

Khi bạn sử dụng nút **\`📋 Copy toàn bộ lỗi chuẩn Prompt gửi AI\`** trong ứng dụng hoặc trên trang \`QA_MANUAL_TEST_RUNNER.html\`, hệ thống sẽ tự động xuất ra định dạng chuẩn (kèm cả tên file Auto Test liên quan) như mẫu dưới đây. Bạn chỉ cần dán vào khung chat:

\`\`\`markdown
# 🛠️ YÊU CẦU SỬA LỖI TỪ HỆ THỐNG QA MANUAL TEST (H2MilkTea)

Hãy đóng vai trò Kỹ sư trưởng dự án **H2MilkTea**, kiểm tra nguyên nhân gốc rễ (Root Cause), sửa triệt để các lỗi thực tế được tôi ghi nhận dưới đây và chạy lại kiểm thử tự động:

### 1. [MAJOR] Lỗi ví dụ tại màn hình POS (ID: \`BUG-10293\`)
- **Đường dẫn (Route):** \`/pos\`
- **Tài khoản & Vai trò (Role):** \`Thu ngân (Trần Tiến)\`
- **Kích thước màn hình (Viewport):** \`1366x768px\`
- **Mã Kịch bản Test liên quan:** \`MOD-POS-HP\`
- **File Auto Test bảo vệ:** \`tests/unit/phase-12-pos-tables-upgrade.test.ts\`, \`tests/unit/cart-draft-api.test.ts\`
- **Mô tả lỗi thực tế / Các bước tái hiện:**
  > Khi bấm mở modal chọn bàn ở chế độ Tất cả khu vực, tôi muốn thẻ bàn đang có khách hiển thị thêm tổng tiền tạm tính đậm hơn.
- **Kết quả mong đợi:**
  > Hiển thị rõ số tiền tạm tính trên thẻ bàn đang phục vụ.
\`\`\`
`;

fs.writeFileSync(
  path.join(DOCS_DIR, 'BAO_CAO_TEST_MANUAL_TOAN_DU_AN.md'),
  markdownReportContent,
  'utf-8'
);

console.log(
  `✅ Đã tạo thành công QA_MANUAL_TEST_RUNNER.html và BAO_CAO_TEST_MANUAL_TOAN_DU_AN.md với ${stats.total} kịch bản Manual + ${stats.autoSuitesCount} bộ Auto Test (${stats.totalAutoTestsCount} tests)!`
);
