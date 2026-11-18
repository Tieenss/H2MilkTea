const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Trả về UUID hợp lệ cho các cột PostgreSQL kiểu UUID (như updated_by trong app_settings, pos_cart_drafts).
 * Nếu staffId là username (ví dụ 'admin', 'staff_pos') hoặc chuỗi không phải UUID, hàm trả về null
 * để tránh lỗi PostgreSQL error 22P02: "invalid input syntax for type uuid".
 */
export function getSafeStaffUuid(staffId?: string | null): string | null {
  if (!staffId || typeof staffId !== 'string') return null;
  return UUID_REGEX.test(staffId.trim()) ? staffId.trim() : null;
}
