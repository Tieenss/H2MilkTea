-- Rollback: Xóa trường "Khu vực" khỏi bảng DSBAN
ALTER TABLE public."DSBAN" DROP COLUMN IF EXISTS "Khu vực";
