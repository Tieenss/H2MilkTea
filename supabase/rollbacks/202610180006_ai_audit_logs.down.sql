-- Rollback: 202610180006_ai_audit_logs.down.sql
-- Mô tả: Hoàn tác tạo bảng ai_audit_logs (Phase 3)

DROP POLICY IF EXISTS ai_audit_logs_staff_update ON public.ai_audit_logs;
DROP POLICY IF EXISTS ai_audit_logs_staff_insert ON public.ai_audit_logs;
DROP POLICY IF EXISTS ai_audit_logs_admin_all ON public.ai_audit_logs;

DROP INDEX IF EXISTS public.idx_ai_audit_logs_status;
DROP INDEX IF EXISTS public.idx_ai_audit_logs_staff;
DROP INDEX IF EXISTS public.idx_ai_audit_logs_created_at;

DROP TABLE IF EXISTS public.ai_audit_logs CASCADE;
