'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Cpu,
  FileSearch,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AuditLogItem {
  id: string;
  createdAt: string;
  staffId?: string;
  staffName?: string;
  staffRole?: string;
  rawMessage: string;
  parsedAction: Record<string, any>;
  source: 'rule' | 'llm';
  status: 'previewed' | 'confirmed' | 'rejected' | 'blocked';
  blockedReason?: string | null;
  latencyMs?: number;
  modelName?: string;
  promptVersion?: string;
}

interface AuditStats {
  totalLogs: number;
  confirmedCount: number;
  rejectedCount: number;
  blockedCount: number;
  previewedCount: number;
  ruleCount: number;
  llmCount: number;
  avgLatencyMs: number;
  accuracyRate: number;
}

const FILTER_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'confirmed', label: 'Đã duyệt' },
  { id: 'previewed', label: 'Chờ duyệt' },
  { id: 'rejected', label: 'Từ chối' },
  { id: 'blocked', label: 'Chặn an toàn' },
] as const;

export function AIAuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    totalLogs: 0,
    confirmedCount: 0,
    rejectedCount: 0,
    blockedCount: 0,
    previewedCount: 0,
    ruleCount: 0,
    llmCount: 0,
    avgLatencyMs: 0,
    accuracyRate: 100,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchAuditLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai/audit?limit=50', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể tải nhật ký kiểm toán AI.');
      }
      if (Array.isArray(data.logs)) setLogs(data.logs);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      setError(err?.message || 'Lỗi kết nối khi tải nhật ký kiểm toán.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs(false);
  }, [fetchAuditLogs]);

  const filteredLogs = useMemo(() => {
    if (statusFilter === 'all') return logs;
    return logs.filter((log) => log.status === statusFilter);
  }, [logs, statusFilter]);

  const ruleEngineRatio = Math.round((stats.ruleCount / Math.max(1, stats.totalLogs)) * 100);

  function formatTime(iso: string) {
    try {
      const date = new Date(iso);
      return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  function renderActionSummary(parsedAction: Record<string, any>) {
    if (!parsedAction || typeof parsedAction !== 'object') return 'Hội thoại / Trả lời';
    const act = String(parsedAction.action || 'qa');
    const tableName = parsedAction.tableName ? ` • ${parsedAction.tableName}` : '';
    const items = Array.isArray(parsedAction.items) ? parsedAction.items : [];

    const actionLabels: Record<string, string> = {
      add_items: 'Thêm món',
      remove_items: 'Bớt món',
      update_items: 'Sửa món',
      clear_cart: 'Xóa giỏ',
      switch_table: 'Chọn bàn',
      qa: 'Hỏi đáp & Tư vấn',
      clarify: 'Cần xác nhận rõ',
    };

    const label = actionLabels[act] || act;
    if (items.length > 0) {
      const itemDesc = items
        .map((it: any) => {
          const qty = it.quantity ?? 1;
          const name = it.productName || it.name || 'Món';
          const size = it.size ? ` (${it.size})` : '';
          return `${qty}x ${name}${size}`;
        })
        .join(', ');
      return `${label}${tableName}: ${itemDesc}`;
    }

    if (parsedAction.topic) {
      return `${label} (${parsedAction.topic})`;
    }

    return `${label}${tableName}`;
  }

  function renderStatusBadge(status: AuditLogItem['status']) {
    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Đã duyệt
          </Badge>
        );
      case 'previewed':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[11px]">
            <Clock className="h-3 w-3 text-blue-600" /> Chờ duyệt
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1 text-[11px]">
            <XCircle className="h-3 w-3 text-rose-600" /> Từ chối
          </Badge>
        );
      case 'blocked':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 gap-1 text-[11px]">
            <ShieldAlert className="h-3 w-3 text-amber-600" /> Chặn an toàn
          </Badge>
        );
      default:
        return null;
    }
  }

  return (
    <Card className="border-indigo-100 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSearch className="h-5 w-5 text-indigo-600" /> Nhật ký Kiểm toán AI (AI Audit Log & Độ chuẩn xác)
            </CardTitle>
            <CardDescription className="mt-1">
              Giám sát thời gian thực mọi câu lệnh gọi món, độ trễ xử lý giữa Rule Engine 0ms và Gemini LLM, cùng tỷ lệ thu ngân xác nhận.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAuditLogs(true)}
            disabled={loading || refreshing}
            className="shrink-0 flex items-center gap-1.5 text-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            Làm mới
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Tổng câu lệnh AI</span>
              <Activity className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalLogs}</p>
            <p className="text-[11px] text-slate-500">
              {stats.confirmedCount} đã duyệt • {stats.blockedCount} chặn an toàn
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span>Độ chuẩn xác / Tỷ lệ duyệt</span>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-800">{stats.accuracyRate}%</p>
            <p className="text-[11px] text-emerald-700/80">
              Dựa trên xác nhận thực tế của thu ngân
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
              <span>Tốc độ phản hồi TB</span>
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-900">{stats.avgLatencyMs} ms</p>
            <p className="text-[11px] text-amber-800/80">
              Tối ưu hóa Hybrid (Rule + LLM)
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-1">
            <div className="flex items-center justify-between text-xs text-indigo-700 font-medium">
              <span>Tỷ lệ Rule Engine 0đ</span>
              <Cpu className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-900">{ruleEngineRatio}%</p>
            <p className="text-[11px] text-indigo-700/80">
              {stats.ruleCount} lệnh Rule • {stats.llmCount} lệnh Gemini
            </p>
          </div>
        </div>

        {/* Bộ lọc trạng thái */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b pb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground">
            Hiển thị {filteredLogs.length} / {logs.length} bản ghi gần nhất
          </span>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>
        )}

        {/* Danh sách Audit Logs */}
        {loading ? (
          <div className="py-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-indigo-600" /> Đang tải dữ liệu kiểm toán AI...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
            Chưa có bản ghi kiểm toán nào thuộc trạng thái này.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {formatTime(log.createdAt)}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {log.staffName || 'Nhân viên POS'}
                    </span>
                    {log.staffRole && (
                      <span className="text-[11px] px-2 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {log.staffRole}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {log.source === 'rule' ? (
                      <Badge
                        variant="outline"
                        className="bg-teal-50 text-teal-700 border-teal-200 text-[11px] gap-1"
                      >
                        <Zap className="h-3 w-3 text-teal-600" /> Rule {Number(log.latencyMs || 0)}ms
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] gap-1"
                      >
                        <Sparkles className="h-3 w-3 text-purple-600" /> Gemini LLM ({Number(log.latencyMs || 0)}ms)
                      </Badge>
                    )}
                    {renderStatusBadge(log.status)}
                  </div>
                </div>

                {/* Câu lệnh gốc & Kết quả phân tích */}
                <div className="text-xs space-y-1.5 pl-1">
                  <p className="text-slate-800">
                    <span className="font-semibold text-slate-500 mr-1.5">Câu lệnh:</span>
                    <span className="font-medium">&ldquo;{log.rawMessage}&rdquo;</span>
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-500">Phân tích AI:</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50/80 text-indigo-900 border border-indigo-100 font-medium">
                      {renderActionSummary(log.parsedAction)}
                    </span>
                  </div>
                  {log.blockedReason && (
                    <p className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Lý do chặn: {log.blockedReason}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
