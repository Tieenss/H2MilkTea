'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bug,
  X,
  Copy,
  Check,
  Download,
  Trash2,
  PlusCircle,
  ClipboardCheck,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Terminal,
  WifiOff,
  Monitor,
  UserCheck,
  MapPin,
  Minimize2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import authUtils from '@/utils/authUtils';
import {
  QABugEntry,
  QABugSeverity,
  QATestCase,
  QATestStatus,
  QAFailedTestFeedback,
  MASTER_QA_TEST_CASES,
  QA_BUG_STORAGE_KEY,
  QA_CHECKLIST_STORAGE_KEY,
  QA_SEVERITY_META,
  QA_LAYER_META,
  getTestCasesForRoute,
  getAutoTestSuitesForRoute,
  formatBugsForAIPrompt,
} from '@/lib/qa-bug-reporter';

interface ChecklistRunRecord {
  status: QATestStatus;
  severity: QABugSeverity;
  note: string;
  updatedAt: string;
}

type ChecklistStateMap = Record<string, ChecklistRunRecord>;

export function QABugReporter() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimizedPill, setIsMinimizedPill] = useState(false);
  const [activeTab, setActiveTab] = useState<'capture' | 'checklist' | 'bugs'>('capture');

  // Context state
  const [fullRoute, setFullRoute] = useState<string>(pathname || '/');
  const [viewport, setViewport] = useState<string>('1280x800');
  const [userRole, setUserRole] = useState<string>('Khách / Chưa đăng nhập');
  const [userName, setUserName] = useState<string>('');
  const [consoleErrors, setConsoleErrors] = useState<string[]>([]);
  const [networkErrors, setNetworkErrors] = useState<string[]>([]);

  // Form state for quick bug capture
  const [severity, setSeverity] = useState<QABugSeverity>('MAJOR');
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [stepsOrActual, setStepsOrActual] = useState<string>('');
  const [expected, setExpected] = useState<string>('');

  // Persisted bugs & checklist state
  const [bugs, setBugs] = useState<QABugEntry[]>([]);
  const [checklistState, setChecklistState] = useState<ChecklistStateMap>({});
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Sync route, role, viewport
  const refreshRuntimeContext = useCallback(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search || '';
    const currentFullRoute = `${pathname || window.location.pathname}${search}`;
    setFullRoute(currentFullRoute);
    setViewport(`${window.innerWidth}x${window.innerHeight}px`);

    try {
      const userData = authUtils.getUserData();
      if (userData) {
        const role =
          userData['Phân quyền'] ||
          userData['Vai trò'] ||
          userData.role ||
          'Nhân viên';
        const name =
          userData['Họ và Tên'] || userData.username || userData.name || '';
        setUserRole(String(role));
        setUserName(String(name));
      } else if ((pathname || '').startsWith('/order')) {
        setUserRole('Khách đặt món QR (Customer)');
        setUserName('Khách tại bàn');
      } else {
        setUserRole('Chưa đăng nhập');
        setUserName('');
      }
    } catch {
      setUserRole('Nhân viên');
    }
  }, [pathname]);

  useEffect(() => {
    refreshRuntimeContext();
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewport(`${window.innerWidth}x${window.innerHeight}px`);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [refreshRuntimeContext]);

  // Load saved bugs & checklist from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawBugs = localStorage.getItem(QA_BUG_STORAGE_KEY);
      if (rawBugs) {
        const parsed = JSON.parse(rawBugs);
        if (Array.isArray(parsed)) setBugs(parsed);
      }
    } catch {
      // ignore
    }
    try {
      const rawChecklist = localStorage.getItem(QA_CHECKLIST_STORAGE_KEY);
      if (rawChecklist) {
        const parsed = JSON.parse(rawChecklist);
        if (parsed && typeof parsed === 'object') setChecklistState(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  // Keyboard shortcut: Alt + B or Ctrl + Shift + B
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.altKey && (e.key === 'b' || e.key === 'B')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'b' || e.key === 'B'))
      ) {
        e.preventDefault();
        refreshRuntimeContext();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refreshRuntimeContext]);

  // Intercept console.error and failed fetch responses (status >= 400)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalConsoleError = console.error;
    const originalFetch = window.fetch;

    console.error = (...args: unknown[]) => {
      originalConsoleError.apply(console, args);
      try {
        const message = args
          .map((arg) => {
            if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
            if (typeof arg === 'object' && arg !== null) {
              try {
                return JSON.stringify(arg);
              } catch {
                return String(arg);
              }
            }
            return String(arg);
          })
          .join(' ')
          .slice(0, 280);

        if (message && !message.includes('Download the React DevTools')) {
          const timestamp = new Date().toLocaleTimeString('vi-VN');
          setConsoleErrors((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
        }
      } catch {
        // ignore
      }
    };

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const reqInfo = args[0];
      const reqInit = args[1];
      const method = reqInit?.method || 'GET';
      const urlStr =
        typeof reqInfo === 'string'
          ? reqInfo
          : reqInfo instanceof URL
          ? reqInfo.toString()
          : reqInfo?.url || 'unknown-url';

      try {
        const response = await originalFetch(...args);
        if (response.status >= 400) {
          const timestamp = new Date().toLocaleTimeString('vi-VN');
          setNetworkErrors((prev) =>
            [`[${timestamp}] ${method} ${urlStr} -> HTTP ${response.status}`, ...prev].slice(
              0,
              10
            )
          );
        }
        return response;
      } catch (err) {
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        const errMsg = err instanceof Error ? err.message : 'Network Error';
        setNetworkErrors((prev) =>
          [`[${timestamp}] ${method} ${urlStr} -> FAILED (${errMsg})`, ...prev].slice(0, 10)
        );
        throw err;
      }
    };

    return () => {
      console.error = originalConsoleError;
      window.fetch = originalFetch;
    };
  }, []);

  // Test cases matching current screen vs other screens
  const screenTestCases = useMemo(
    () => getTestCasesForRoute(pathname),
    [pathname]
  );

  const screenAutoSuites = useMemo(
    () => getAutoTestSuitesForRoute(pathname),
    [pathname]
  );

  const otherTestCases = useMemo(() => {
    const screenIds = new Set(screenTestCases.map((tc) => tc.id));
    return MASTER_QA_TEST_CASES.filter((tc) => !screenIds.has(tc.id));
  }, [screenTestCases]);

  const failedChecklistItems = useMemo<QAFailedTestFeedback[]>(() => {
    const list: QAFailedTestFeedback[] = [];
    MASTER_QA_TEST_CASES.forEach((tc) => {
      const st = checklistState[tc.id];
      if (st && (st.status === 'FAIL' || st.status === 'BLOCKED')) {
        list.push({
          testCase: tc,
          note: st.note || '',
          severity: st.severity || 'MAJOR',
          status: st.status,
        });
      }
    });
    return list;
  }, [checklistState]);

  const totalActionableIssues = bugs.length + failedChecklistItems.length;

  const saveBugsList = (nextBugs: QABugEntry[]) => {
    setBugs(nextBugs);
    try {
      localStorage.setItem(QA_BUG_STORAGE_KEY, JSON.stringify(nextBugs));
    } catch {
      // ignore
    }
  };

  const saveChecklistMap = (nextMap: ChecklistStateMap) => {
    setChecklistState(nextMap);
    try {
      localStorage.setItem(QA_CHECKLIST_STORAGE_KEY, JSON.stringify(nextMap));
    } catch {
      // ignore
    }
  };

  const handleSelectTestCasePrefill = (tcId: string) => {
    setSelectedTestCaseId(tcId);
    if (!tcId) return;
    const found = MASTER_QA_TEST_CASES.find((t) => t.id === tcId);
    if (found) {
      if (!title.trim()) {
        setTitle(`Lỗi tại kịch bản ${found.id}: ${found.title}`);
      }
      if (!expected.trim()) {
        setExpected(found.expectedResult);
      }
    }
  };

  const createBugEntryFromForm = (): QABugEntry | null => {
    if (!title.trim() && !stepsOrActual.trim()) {
      toast.error('Vui lòng nhập Tiêu đề hoặc Mô tả lỗi thực tế bạn vừa gặp!');
      return null;
    }

    const finalTitle =
      title.trim() ||
      stepsOrActual.trim().split('\n')[0].slice(0, 90) ||
      `Lỗi trên trang ${fullRoute}`;
    const finalSteps =
      stepsOrActual.trim() ||
      `Gặp lỗi "${finalTitle}" khi thao tác tại đường dẫn ${fullRoute}.`;

    const entry: QABugEntry = {
      id: `BUG-${Date.now().toString().slice(-5)}`,
      createdAt: new Date().toLocaleString('vi-VN'),
      route: fullRoute,
      userRole,
      userName: userName || undefined,
      viewport,
      severity,
      title: finalTitle,
      stepsOrActual: finalSteps,
      expected: expected.trim() || undefined,
      testCaseId: selectedTestCaseId || undefined,
      consoleErrors: [...consoleErrors],
      networkErrors: [...networkErrors],
    };

    return entry;
  };

  const handleSaveBug = (copyImmediately: boolean) => {
    const entry = createBugEntryFromForm();
    if (!entry) return;

    const nextBugs = [entry, ...bugs];
    saveBugsList(nextBugs);

    // Reset form inputs
    setTitle('');
    setStepsOrActual('');
    setExpected('');
    setSelectedTestCaseId('');

    if (copyImmediately) {
      const promptText = formatBugsForAIPrompt(nextBugs, failedChecklistItems);
      navigator.clipboard
        .writeText(promptText)
        .then(() => {
          setCopiedPrompt(true);
          setTimeout(() => setCopiedPrompt(false), 2500);
          toast.success(
            'Đã lưu lỗi & Copy toàn bộ Prompt chuẩn vào Clipboard! Hãy dán (Ctrl+V) vào khung chat AI.'
          );
        })
        .catch(() => {
          toast.success('Đã lưu lỗi vào danh sách QA!');
        });
      setActiveTab('bugs');
    } else {
      toast.success(`Đã ghi nhận lỗi [${entry.id}] vào danh sách QA!`);
    }
  };

  const handleCopyAllForAI = () => {
    const promptText = formatBugsForAIPrompt(bugs, failedChecklistItems);
    if (bugs.length === 0 && failedChecklistItems.length === 0) {
      toast.error('Chưa có lỗi hoặc kịch bản FAIL nào để copy!');
      return;
    }
    navigator.clipboard
      .writeText(promptText)
      .then(() => {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2500);
        toast.success(
          `Đã Copy ${totalActionableIssues} lỗi theo chuẩn Prompt AI! Dán ngay vào khung chat Antigravity.`
        );
      })
      .catch(() => {
        toast.error('Không thể truy cập Clipboard trình duyệt.');
      });
  };

  const handleDownloadMarkdown = () => {
    const promptText = formatBugsForAIPrompt(bugs, failedChecklistItems);
    const blob = new Blob([promptText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-loi-qa-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã tải xuống file báo cáo lỗi (.md)!');
  };

  const handleDeleteSingleBug = (id: string) => {
    const next = bugs.filter((b) => b.id !== id);
    saveBugsList(next);
    toast.success('Đã xóa lỗi khỏi danh sách.');
  };

  const handleClearAllBugs = () => {
    saveBugsList([]);
    toast.success('Đã làm sạch danh sách lỗi đã bắt.');
  };

  const handleSetTestCaseStatus = (tc: QATestCase, status: QATestStatus) => {
    const prev = checklistState[tc.id];
    const nextRecord: ChecklistRunRecord = {
      status,
      severity: prev?.severity || 'MAJOR',
      note: prev?.note || '',
      updatedAt: new Date().toLocaleString('vi-VN'),
    };
    saveChecklistMap({
      ...checklistState,
      [tc.id]: nextRecord,
    });
  };

  const handleUpdateTestCaseFeedback = (
    tc: QATestCase,
    patch: Partial<Pick<ChecklistRunRecord, 'note' | 'severity'>>
  ) => {
    const prev = checklistState[tc.id] || {
      status: 'FAIL' as QATestStatus,
      severity: 'MAJOR' as QABugSeverity,
      note: '',
      updatedAt: new Date().toLocaleString('vi-VN'),
    };
    saveChecklistMap({
      ...checklistState,
      [tc.id]: {
        ...prev,
        ...patch,
        updatedAt: new Date().toLocaleString('vi-VN'),
      },
    });
  };

  return (
    <>
      {/* Nút nổi QA Bug Reporter ở góc dưới bên trái (không bao giờ đè lên nút AI ở góc phải) */}
      <div className="fixed bottom-3 left-3 z-[85] flex items-center gap-1.5 print:hidden">
        {isMinimizedPill ? (
          <button
            type="button"
            onClick={() => setIsMinimizedPill(false)}
            title="Mở lại nút Báo lỗi QA (Phím tắt: Alt + B)"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-400 shadow-lg border border-slate-700 transition-all"
          >
            <Bug className="w-4 h-4" />
            {totalActionableIssues > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {totalActionableIssues}
              </span>
            )}
          </button>
        ) : (
          <div className="flex items-center bg-slate-900/95 hover:bg-slate-900 text-white rounded-full shadow-xl border border-slate-700/80 backdrop-blur-sm overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => {
                refreshRuntimeContext();
                setIsOpen(true);
              }}
              title="Mở công cụ ghi nhận lỗi & Checklist QA màn hình này (Alt + B)"
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold tracking-tight hover:text-amber-300 transition-colors"
            >
              <Bug className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Báo lỗi QA</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  totalActionableIssues > 0
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {totalActionableIssues}
              </span>
            </button>
            {totalActionableIssues > 0 && (
              <button
                type="button"
                onClick={handleCopyAllForAI}
                title="Copy nhanh toàn bộ lỗi chuẩn Prompt để dán cho AI sửa ngay"
                className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 border-l border-slate-700 transition-colors"
              >
                {copiedPrompt ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Copy gửi AI</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMinimizedPill(true)}
              title="Thu nhỏ nút QA"
              className="px-2 py-2 text-slate-400 hover:text-white border-l border-slate-800 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modal / Drawer QA Bug Reporter */}
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                  <Bug className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold truncate flex items-center gap-2">
                    <span>Trung tâm Kiểm thử Manual & Bắt lỗi Trực tiếp (QA Bug Reporter)</span>
                    <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/10 text-amber-300">
                      Phím tắt: Alt + B
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 truncate">
                    Tự động đính kèm Route, Vai trò, Kích thước màn hình, Console/Network log & Xuất Prompt sửa lỗi cho Antigravity AI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Đóng cửa sổ QA"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thanh Context Tự động bắt được tại màn hình hiện tại */}
            <div className="px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono font-semibold border border-blue-200 dark:border-blue-800">
                <MapPin className="w-3.5 h-3.5" />
                Route: {fullRoute}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800">
                <UserCheck className="w-3.5 h-3.5" />
                Vai trò: {userRole}
                {userName ? ` (${userName})` : ''}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono border border-slate-300 dark:border-slate-600">
                <Monitor className="w-3.5 h-3.5" />
                {viewport}
              </span>
              {consoleErrors.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 font-semibold border border-red-200">
                  <Terminal className="w-3.5 h-3.5" />
                  {consoleErrors.length} Console Error
                </span>
              )}
              {networkErrors.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 font-semibold border border-orange-200">
                  <WifiOff className="w-3.5 h-3.5" />
                  {networkErrors.length} API Lỗi
                </span>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="px-4 sm:px-6 pt-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('capture')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'capture'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>➕ Ghi nhận lỗi màn hình này</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('checklist')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'checklist'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>✅ Checklist màn hình này ({screenTestCases.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bugs')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === 'bugs'
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>📋 Danh sách lỗi chờ gửi AI ({totalActionableIssues})</span>
                </button>
              </div>
            </div>

            {/* Body Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {activeTab === 'capture' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mức độ nghiêm trọng */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        1. Mức độ lỗi (Severity)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          ['CRITICAL', 'MAJOR', 'MINOR', 'UI_UX'] as QABugSeverity[]
                        ).map((sev) => (
                          <button
                            key={sev}
                            type="button"
                            onClick={() => setSeverity(sev)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left transition-all ${
                              severity === sev
                                ? `${QA_SEVERITY_META[sev].badgeClass} ring-2 ring-indigo-500`
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {QA_SEVERITY_META[sev].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chọn mã Test Case liên quan (ưu tiên màn hình hiện tại) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                        2. Gắn với Kịch bản Test (Tùy chọn - Tự động lọc theo trang này)
                      </label>
                      <select
                        value={selectedTestCaseId}
                        onChange={(e) => handleSelectTestCasePrefill(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">
                          -- Lỗi tự do / Không gắn mã Test Case cụ thể --
                        </option>
                        {screenTestCases.length > 0 && (
                          <optgroup
                            label={`🎯 Kịch bản của màn hình hiện tại (${pathname})`}
                          >
                            {screenTestCases.map((tc) => (
                              <option key={tc.id} value={tc.id}>
                                [{tc.id}] ({QA_LAYER_META[tc.layer].shortLabel}){' '}
                                {tc.title}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="📚 Các kịch bản phân hệ khác">
                          {otherTestCases.map((tc) => (
                            <option key={tc.id} value={tc.id}>
                              [{tc.id}] ({tc.route}) {tc.title}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Mẹo: Chọn kịch bản sẽ tự động điền sẵn kỳ vọng chuẩn để bạn không phải gõ nhiều.
                      </p>
                    </div>
                  </div>

                  {/* Tiêu đề lỗi */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                      3. Tiêu đề lỗi ngắn gọn <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="VD: Bấm nút Chuyển bàn từ Bàn 01 sang Bàn 02 bị treo hoặc lệch danh sách khu vực..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Mô tả thực tế & Kết quả mong đợi */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        4. Mô tả chi tiết / Các bước bạn vừa thao tác{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={stepsOrActual}
                        onChange={(e) => setStepsOrActual(e.target.value)}
                        placeholder="Mô tả những gì bạn vừa bấm và biểu hiện lỗi thực tế trên màn hình..."
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                        5. Kết quả bạn mong muốn (Tùy chọn)
                      </label>
                      <textarea
                        rows={4}
                        value={expected}
                        onChange={(e) => setExpected(e.target.value)}
                        placeholder="Mô tả cách hệ thống nên hoạt động đúng hoặc giao diện bạn mong muốn..."
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Hiển thị tự động Console / Network Errors nếu có */}
                  {(consoleErrors.length > 0 || networkErrors.length > 0) && (
                    <div className="p-3 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs space-y-1.5">
                      <div className="font-bold text-red-800 dark:text-red-300 flex items-center justify-between">
                        <span>
                          ⚡ Hệ thống tự động bắt được lỗi kỹ thuật ngầm (sẽ tự động đính kèm vào báo cáo):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setConsoleErrors([]);
                            setNetworkErrors([]);
                          }}
                          className="text-[11px] underline text-red-600 hover:text-red-800"
                        >
                          Xóa log cũ
                        </button>
                      </div>
                      {consoleErrors.slice(0, 3).map((err, i) => (
                        <div
                          key={`ce-${i}`}
                          className="font-mono text-[11px] text-red-700 dark:text-red-300 truncate"
                        >
                          • Console: {err}
                        </div>
                      ))}
                      {networkErrors.slice(0, 3).map((net, i) => (
                        <div
                          key={`ne-${i}`}
                          className="font-mono text-[11px] text-orange-700 dark:text-orange-300 truncate"
                        >
                          • Network: {net}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleSaveBug(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <PlusCircle className="w-4 h-4 text-amber-400" />
                      <span>💾 Lưu vào danh sách lỗi (Tiếp tục test trang khác)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBug(true)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>⚡ Lưu & Copy Prompt gửi AI ngay</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'checklist' && (
                <div className="space-y-3">
                  {screenAutoSuites.length > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                          🤖 {screenAutoSuites.length} Bộ Kiểm thử Tự động (Vitest / Playwright) đang bảo vệ trang `{pathname}`:
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {screenAutoSuites.map((suite) => (
                          <div
                            key={suite.id}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                [{suite.runner}] {suite.title}
                              </div>
                              <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                                {suite.filePath} ({suite.testCount} tests PASS)
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(suite.command);
                                toast.success(`Đã copy lệnh: ${suite.command}`);
                              }}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold shrink-0"
                            >
                              Copy lệnh
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                        🎯 Danh sách Kịch bản cần kiểm tra tại màn hình `{pathname}` ({screenTestCases.length} kịch bản)
                      </h3>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300">
                        Bấm ✅ PASS nếu đạt, hoặc bấm ❌ FAIL để nhập ghi chú lỗi ngay tại chỗ. Tất cả kịch bản FAIL sẽ tự động gộp vào Prompt gửi AI!
                      </p>
                    </div>
                  </div>

                  {screenTestCases.map((tc) => {
                    const st = checklistState[tc.id]?.status || 'UNTESTED';
                    const note = checklistState[tc.id]?.note || '';
                    const sev = checklistState[tc.id]?.severity || 'MAJOR';

                    return (
                      <div
                        key={tc.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          st === 'PASS'
                            ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                            : st === 'FAIL' || st === 'BLOCKED'
                            ? 'bg-red-50/50 border-red-300 dark:bg-red-950/20 dark:border-red-800'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-[240px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono text-xs font-bold">
                                {tc.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  QA_LAYER_META[tc.layer].badgeClass
                                }`}
                              >
                                {QA_LAYER_META[tc.layer].shortLabel}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                • Vai trò: {tc.role}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {tc.title}
                            </h4>
                          </div>

                          {/* Status toggle buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSetTestCaseStatus(tc, 'PASS')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors ${
                                st === 'PASS'
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              PASS
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetTestCaseStatus(tc, 'FAIL')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors ${
                                st === 'FAIL'
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'bg-white text-red-700 border-red-300 hover:bg-red-50'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              FAIL
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetTestCaseStatus(tc, 'BLOCKED')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors ${
                                st === 'BLOCKED'
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                              }`}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              BLOCKED
                            </button>
                            {st !== 'UNTESTED' && (
                              <button
                                type="button"
                                onClick={() => handleSetTestCaseStatus(tc, 'UNTESTED')}
                                title="Reset trạng thái"
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Các bước:{' '}
                            </span>
                            {tc.steps.join(' → ')}
                          </div>
                          <div>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Kỳ vọng chuẩn:{' '}
                            </span>
                            {tc.expectedResult}
                          </div>
                        </div>

                        {(st === 'FAIL' || st === 'BLOCKED') && (
                          <div className="mt-3 pt-2.5 border-t border-red-200 dark:border-red-800/60 flex flex-col sm:flex-row gap-2">
                            <select
                              value={sev}
                              onChange={(e) =>
                                handleUpdateTestCaseFeedback(tc, {
                                  severity: e.target.value as QABugSeverity,
                                })
                              }
                              className="rounded-lg border border-red-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                            >
                              <option value="CRITICAL">Critical (Nghiêm trọng)</option>
                              <option value="MAJOR">Major (Sai nghiệp vụ)</option>
                              <option value="MINOR">Minor (Lỗi nhỏ)</option>
                              <option value="UI_UX">UI/UX (Giao diện)</option>
                            </select>
                            <input
                              type="text"
                              value={note}
                              onChange={(e) =>
                                handleUpdateTestCaseFeedback(tc, { note: e.target.value })
                              }
                              placeholder="Nhập biểu hiện lỗi thực tế bạn gặp ở kịch bản này (tự động lưu)..."
                              className="flex-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'bugs' && (
                <div className="space-y-4">
                  {/* Action toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
                    <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Tổng hợp: <span className="text-red-600 font-bold">{bugs.length}</span> lỗi bắt trực tiếp &{' '}
                      <span className="text-amber-600 font-bold">{failedChecklistItems.length}</span> kịch bản FAIL/BLOCKED
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyAllForAI}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        {copiedPrompt ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span>📋 Copy toàn bộ lỗi chuẩn Prompt gửi AI</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadMarkdown}
                        className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>📥 Tải file (.md)</span>
                      </button>
                      {bugs.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllBugs}
                          className="px-3 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>🗑️ Xóa danh sách đã sửa</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {bugs.length === 0 && failedChecklistItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      Chưa có lỗi nào được ghi nhận. Bạn có thể bấm tab{' '}
                      <strong className="text-indigo-600">➕ Ghi nhận lỗi màn hình này</strong> hoặc đánh dấu{' '}
                      <strong className="text-red-600">❌ FAIL</strong> trong Checklist!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bugs.map((b) => (
                        <div
                          key={b.id}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded font-bold border ${
                                  QA_SEVERITY_META[b.severity]?.badgeClass
                                }`}
                              >
                                {b.severity}
                              </span>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                {b.id}
                              </span>
                              <span className="font-mono text-blue-600 dark:text-blue-400">
                                {b.route}
                              </span>
                              {b.testCaseId && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                                  TC: {b.testCaseId}
                                </span>
                              )}
                              <span className="text-slate-400">{b.createdAt}</span>
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {b.title}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line">
                              {b.stepsOrActual}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSingleBug(b.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="Xóa lỗi này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {failedChecklistItems.map((item) => (
                        <div
                          key={item.testCase.id}
                          className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 dark:bg-red-950/20 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold">
                                {item.status}
                              </span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {item.testCase.id}
                              </span>
                              <span className="font-mono text-blue-700">
                                {item.testCase.route}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {item.testCase.title}
                            </div>
                            {item.note && (
                              <div className="text-red-700 font-medium">
                                Ghi chú thực tế: {item.note}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleSetTestCaseStatus(item.testCase, 'UNTESTED')
                            }
                            className="text-xs underline text-slate-500 hover:text-slate-800"
                          >
                            Bỏ đánh dấu FAIL
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default QABugReporter;
