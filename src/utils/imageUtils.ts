const UNSPLASH_HOST = 'images.unsplash.com';

export function isPlaceholderImageUrl(url?: string | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase().includes('placeholder');
}

/**
 * Chuẩn hóa URL ảnh sản phẩm:
 * - Trả về chuỗi rỗng nếu là URL trống hoặc placeholder để hiển thị fallback UI.
 * - Định tuyến ảnh Unsplash qua `/api/image-proxy` nhằm tránh lỗi `ERR_BLOCKED_BY_ORB` trên trình duyệt.
 */
export function getSafeImageUrl(url?: string | null): string {
  if (isPlaceholderImageUrl(url)) return '';
  const trimmed = String(url).trim();

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' && parsed.hostname === UNSPLASH_HOST) {
      return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
    }
  } catch {
    // URL tương đối hoặc data URI hợp lệ vẫn giữ nguyên
  }

  return trimmed;
}
