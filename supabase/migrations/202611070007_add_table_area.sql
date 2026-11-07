-- Migration: Thêm trường "Khu vực" vào bảng Danh sách bàn (DSBAN)
-- Cung cấp khả năng phân nhóm: Phòng hát, Quầy, Vườn, Mang về...

ALTER TABLE public."DSBAN" ADD COLUMN IF NOT EXISTS "Khu vực" text;

COMMENT ON COLUMN public."DSBAN"."Khu vực" IS 'Khu vực của bàn: Phòng hát, Quầy, Vườn, Mang về hoặc tùy chỉnh';
