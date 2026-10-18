-- Migration: 202610180006_ai_audit_logs.sql
-- Mô tả: Tạo bảng ai_audit_logs phục vụ kiểm toán, phân tích và giám sát an toàn cho Trợ lý AI (Phase 3)

CREATE TABLE IF NOT EXISTS public.ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    staff_id TEXT,
    staff_name TEXT,
    staff_role TEXT,
    raw_message TEXT NOT NULL,
    parsed_action JSONB NOT NULL DEFAULT '{}'::jsonb,
    source TEXT NOT NULL CHECK (source IN ('rule', 'llm', 'fallback')),
    status TEXT NOT NULL CHECK (status IN ('previewed', 'confirmed', 'rejected', 'blocked')),
    blocked_reason TEXT,
    latency_ms INTEGER DEFAULT 0,
    model_name TEXT,
    prompt_version TEXT
);

-- Chỉ mục tối ưu cho truy vấn audit & báo cáo
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON public.ai_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_staff ON public.ai_audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_status ON public.ai_audit_logs(status);

-- Kích hoạt Row Level Security (RLS)
ALTER TABLE public.ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin có toàn quyền đọc và quản lý audit logs
CREATE POLICY ai_audit_logs_admin_all ON public.ai_audit_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public."DSNV"
            WHERE ("DSNV"."IDNV"::text = (auth.jwt() ->> 'sub') OR "DSNV"."Username"::text = (auth.jwt() ->> 'sub'))
            AND ("DSNV"."Vai trò" = 'Quản trị viên' OR "DSNV"."Vai trò" = 'Admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public."DSNV"
            WHERE ("DSNV"."IDNV"::text = (auth.jwt() ->> 'sub') OR "DSNV"."Username"::text = (auth.jwt() ->> 'sub'))
            AND ("DSNV"."Vai trò" = 'Quản trị viên' OR "DSNV"."Vai trò" = 'Admin')
        )
    );

-- Policy: Nhân viên thu ngân chỉ có thể ghi nhận log và cập nhật trạng thái log của chính mình
CREATE POLICY ai_audit_logs_staff_insert ON public.ai_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY ai_audit_logs_staff_update ON public.ai_audit_logs
    FOR UPDATE
    TO authenticated
    USING (staff_id = (auth.jwt() ->> 'sub'))
    WITH CHECK (staff_id = (auth.jwt() ->> 'sub'));

-- Service Role (dùng cho Server API Next.js) có toàn quyền không bị RLS giới hạn
