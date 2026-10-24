/**
 * Module quản lý phiên đăng nhập nhân viên trên Client (Thuần TypeScript, nhẹ, không kéo theo thư viện ngoài)
 */
import config from '@/config/config';

export interface UserSession {
  id?: string;
  username: string;
  fullName?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Lấy thông tin người dùng hiện tại đang đăng nhập từ localStorage
 */
export function getCurrentUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(config.AUTH.USER_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Lỗi khi đọc phiên đăng nhập:', err);
    return null;
  }
}

/**
 * Kiểm tra xem người dùng có đang đăng nhập hợp lệ không
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const token = localStorage.getItem(config.AUTH.TOKEN_KEY);
    const expiry = localStorage.getItem(config.AUTH.TOKEN_EXPIRY_KEY);
    if (!token) return false;
    if (expiry && Date.now() > Number(expiry)) {
      localStorage.removeItem(config.AUTH.TOKEN_KEY);
      localStorage.removeItem(config.AUTH.USER_DATA_KEY);
      localStorage.removeItem(config.AUTH.TOKEN_EXPIRY_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
