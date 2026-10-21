// utils/googleDriveUtils.ts
import { GOOGLE_DRIVE_CONFIG } from '@/config/googleDrive';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export interface GoogleDriveAuthInfo {
  accessToken: string;
  expiresAt: number;
  userEmail?: string;
  userName?: string;
  userPicture?: string;
  autoSyncEnabled?: boolean;
  lastSync?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime?: string;
  size?: string;
}

class GoogleDriveUtils {
  private isInitialized = false;
  private accessToken: string | null = null;
  private tokenClient: any = null;
  private folderId: string | null = null;
  private initializationError: string | null = null;
  private autoBackupIntervalId: any = null;

  // 1. Khởi tạo Google Identity Services
  async initializeGoogleAPI(): Promise<boolean> {
    try {
      this.initializationError = null;

      if (typeof window === 'undefined') {
        this.initializationError = 'SSR không hỗ trợ Google API';
        return false;
      }

      const configValidation = this.validateConfiguration();
      if (!configValidation.isValid) {
        this.initializationError = `Cấu hình chưa hợp lệ: ${configValidation.errors.join(', ')}`;
        return false;
      }

      // Nạp script GIS (Google Identity Services)
      await this.loadGISScript();

      // Khởi tạo Token Client
      if (window.google?.accounts?.oauth2) {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
          scope: GOOGLE_DRIVE_CONFIG.SCOPES,
          callback: () => {}, // Sẽ override theo từng promise request
          error_callback: (err: any) => {
            console.error('Google OAuth popup error:', err);
          },
        });
        this.isInitialized = true;
        return true;
      } else {
        this.initializationError = 'Không thể nạp Google Identity Services (GIS)';
        return false;
      }
    } catch (error: any) {
      console.error('Error initializing Google API:', error);
      this.initializationError = error.message || 'Lỗi khởi tạo không xác định';
      return false;
    }
  }

  private loadGISScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Lỗi nạp GIS script')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Không thể tải Google Identity Services script'));
      document.head.appendChild(script);
    });
  }

  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!GOOGLE_DRIVE_CONFIG.CLIENT_ID) {
      errors.push('Thiếu Google Client ID. Vui lòng cấu hình Client ID của ứng dụng.');
    } else if (!GOOGLE_DRIVE_CONFIG.CLIENT_ID.includes('.apps.googleusercontent.com')) {
      errors.push('Client ID không đúng định dạng Google OAuth (*.apps.googleusercontent.com)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getInitializationError(): string | null {
    return this.initializationError;
  }

  // 2. Đăng nhập và xin cấp quyền OAuth2 Access Token
  async signIn(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      if (!this.isInitialized) {
        const ok = await this.initializeGoogleAPI();
        if (!ok) return { success: false, error: this.initializationError || 'Khởi tạo thất bại' };
      }

      return new Promise((resolve) => {
        let isSettled = false;

        this.tokenClient.callback = async (response: any) => {
          if (isSettled) return;
          isSettled = true;

          if (response.error) {
            resolve({ success: false, error: `Google OAuth Error: ${response.error}` });
            return;
          }

          this.accessToken = response.access_token;
          const expiresIn = response.expires_in || 3599;
          const expiresAt = Date.now() + expiresIn * 1000;

          // Lấy thông tin tài khoản user
          let userInfo: any = {};
          try {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${this.accessToken}` },
            });
            if (userRes.ok) {
              userInfo = await userRes.json();
            }
          } catch {}

          const authInfo: GoogleDriveAuthInfo = {
            accessToken: this.accessToken!,
            expiresAt,
            userEmail: userInfo.email,
            userName: userInfo.name,
            userPicture: userInfo.picture,
            autoSyncEnabled: true,
          };

          this.saveAuthInfo(authInfo);
          resolve({ success: true, user: userInfo });
        };

        this.tokenClient.error_callback = (err: any) => {
          if (isSettled) return;
          isSettled = true;
          resolve({
            success: false,
            error: err?.message || 'Cửa sổ đăng nhập Google đã bị đóng hoặc bị chặn',
          });
        };

        // Kích hoạt popup đăng nhập Google
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Lỗi đăng nhập Google Drive' };
    }
  }

  async signOut(): Promise<void> {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('googleDriveAuth');
    }
    this.stopAutoBackupTimer();
  }

  isSignedIn(): boolean {
    const auth = this.getAuthInfo();
    return !!(auth && auth.accessToken && auth.expiresAt > Date.now());
  }

  getAuthInfo(): GoogleDriveAuthInfo | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('googleDriveAuth');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveAuthInfo(info: GoogleDriveAuthInfo): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('googleDriveAuth', JSON.stringify(info));
    } catch {}
  }

  async restoreAuthFromStorage(): Promise<boolean> {
    const auth = this.getAuthInfo();
    if (auth && auth.accessToken && auth.expiresAt > Date.now()) {
      this.accessToken = auth.accessToken;
      return true;
    }
    return false;
  }

  // Đảm bảo token hợp lệ
  private async ensureToken(): Promise<string> {
    if (this.isSignedIn() && this.accessToken) {
      return this.accessToken;
    }

    const auth = this.getAuthInfo();
    if (auth && auth.accessToken && auth.expiresAt > Date.now()) {
      this.accessToken = auth.accessToken;
      return this.accessToken;
    }

    throw new Error('Chưa đăng nhập hoặc phiên làm việc Google Drive đã hết hạn.');
  }

  // 3. Quản lý Thư mục Backup trên Google Drive
  private async getOrCreateBackupFolder(token: string): Promise<string> {
    if (this.folderId) return this.folderId;

    const folderName = GOOGLE_DRIVE_CONFIG.FOLDER_NAME;
    const q = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        this.folderId = data.files[0].id;
        return this.folderId!;
      }
    }

    // Tạo thư mục mới nếu chưa có
    const createUrl = 'https://www.googleapis.com/drive/v3/files';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (createRes.ok) {
      const newFolder = await createRes.json();
      this.folderId = newFolder.id;
      return this.folderId!;
    }

    return 'root';
  }

  // 4. Danh sách các bản sao lưu trên Drive
  async listBackups(): Promise<{ success: boolean; files?: GoogleDriveFile[]; error?: string }> {
    try {
      const token = await this.ensureToken();
      const folderId = await this.getOrCreateBackupFolder(token);

      const q = `'${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        q
      )}&fields=files(id,name,createdTime,modifiedTime,size)&orderBy=createdTime desc`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return { success: false, error: errJson.error?.message || 'Không thể lấy danh sách file từ Drive' };
      }

      const data = await res.json();
      return { success: true, files: data.files || [] };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // 5. Tải file sao lưu lên Google Drive (Multipart Upload v3)
  async uploadBackup(backupData: any): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const token = await this.ensureToken();
      const folderId = await this.getOrCreateBackupFolder(token);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `H2MilkTea_Backup_${timestamp}.json`;
      const jsonContent = JSON.stringify(backupData, null, 2);

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId],
      };

      const boundary = '-------H2MilkTeaBoundary' + Math.random().toString(36).substring(2);
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        jsonContent +
        closeDelimiter;

      const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        return { success: false, error: errJson.error?.message || 'Lỗi khi upload lên Google Drive' };
      }

      const uploaded = await uploadRes.json();
      this.updateLastSyncTime();

      return { success: true, fileId: uploaded.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // 6. Tải file sao lưu từ Drive về
  async downloadBackup(fileId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const token = await this.ensureToken();
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

      const res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return { success: false, error: 'Không thể tải nội dung file từ Google Drive' };
      }

      const data = await res.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // 7. Đồng bộ dữ liệu mới nhất (tải bản backup mới nhất từ Drive và khôi phục, hoặc tạo bản sao lưu mới nếu Drive trống)
  async syncLatestData(): Promise<boolean> {
    try {
      const listRes = await this.listBackups();
      if (!listRes.success) return false;

      if (listRes.files && listRes.files.length > 0) {
        const latestFile = listRes.files[0];
        const dl = await this.downloadBackup(latestFile.id);
        if (!dl.success || !dl.data) return false;

        const backupPayload = dl.data.tables ? dl.data : dl.data.backup || dl.data;

        if (typeof window !== 'undefined' && backupPayload.localStorageData) {
          Object.entries(backupPayload.localStorageData).forEach(([k, v]) => {
            if (typeof v === 'string') {
              localStorage.setItem(k, v);
            } else if (v !== undefined && v !== null) {
              localStorage.setItem(k, JSON.stringify(v));
            }
          });
        }

        if (backupPayload.tables) {
          await fetch('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tables: backupPayload.tables }),
          });
        }

        this.updateLastSyncTime();
        return true;
      } else {
        const exportRes = await fetch('/api/backup/export');
        if (!exportRes.ok) return false;
        const exportData = await exportRes.json();
        const up = await this.uploadBackup(exportData.backup || exportData);
        return up.success;
      }
    } catch (err) {
      console.error('Lỗi syncLatestData:', err);
      return false;
    }
  }

  // 8. Xóa các bản sao lưu cũ để tiết kiệm dung lượng
  async deleteOldBackups(keepCount = 10): Promise<void> {
    try {
      const listRes = await this.listBackups();
      if (!listRes.success || !listRes.files) return;

      const token = await this.ensureToken();
      const toDelete = listRes.files.slice(keepCount);

      for (const f of toDelete) {
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {}
      }
    } catch (err) {
      console.warn('Lỗi khi xóa backup cũ:', err);
    }
  }

  private updateLastSyncTime(): void {
    const auth = this.getAuthInfo();
    if (auth) {
      auth.lastSync = new Date().toISOString();
      this.saveAuthInfo(auth);
    }
  }

  setAutoSync(enabled: boolean): void {
    const auth = this.getAuthInfo();
    if (auth) {
      auth.autoSyncEnabled = enabled;
      this.saveAuthInfo(auth);
    }
    if (enabled) {
      this.startAutoBackupTimer();
    } else {
      this.stopAutoBackupTimer();
    }
  }

  shouldAutoSync(): boolean {
    const auth = this.getAuthInfo();
    if (!auth || !auth.autoSyncEnabled || !auth.accessToken) return false;
    if (!auth.lastSync) return true;

    const lastSyncTime = new Date(auth.lastSync).getTime();
    const elapsedHours = (Date.now() - lastSyncTime) / (1000 * 60 * 60);
    return elapsedHours >= 24;
  }

  startAutoBackupTimer(): void {
    if (typeof window === 'undefined') return;
    this.stopAutoBackupTimer();

    this.autoBackupIntervalId = setInterval(async () => {
      if (this.shouldAutoSync()) {
        try {
          const exportRes = await fetch('/api/backup/export');
          if (exportRes.ok) {
            const data = await exportRes.json();
            if (data.backup) {
              await this.uploadBackup(data.backup);
              await this.deleteOldBackups(10);
            }
          }
        } catch (err) {
          console.warn('Auto backup periodic failed:', err);
        }
      }
    }, 60 * 60 * 1000); // Check mỗi 1 giờ
  }

  stopAutoBackupTimer(): void {
    if (this.autoBackupIntervalId) {
      clearInterval(this.autoBackupIntervalId);
      this.autoBackupIntervalId = null;
    }
  }

  getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      isSignedIn: this.isSignedIn(),
      hasToken: !!this.accessToken,
      config: GOOGLE_DRIVE_CONFIG.getDebugInfo(),
    };
  }

  async forceReinitialize(): Promise<boolean> {
    this.isInitialized = false;
    return await this.initializeGoogleAPI();
  }
}

export const googleDriveUtils = new GoogleDriveUtils();
export default googleDriveUtils;
