// utils/googleDriveUtils.ts
import { GOOGLE_DRIVE_CONFIG } from '@/config/googleDrive';

declare global {
  interface Window {
    gapi: any;
    google: any;
    GoogleAuth: any;
  }
}

class GoogleDriveUtils {
  private isInitialized = false;
  private accessToken: string | null = null;
  private folderId: string | null = null;
  private tokenClient: any = null;
  private initializationError: string | null = null;

  // Khởi tạo Google API với Google Identity Services
  async initializeGoogleAPI(): Promise<boolean> {
    try {
      this.initializationError = null;

      if (typeof window === 'undefined') {
        this.initializationError = 'Window object not available (SSR)';
        console.warn('Server-side rendering, skipping Google API initialization');
        return false;
      }

      console.log('🚀 Starting Google API initialization...');

      // Validate configuration
      const configValidation = this.validateConfiguration();
      if (!configValidation.isValid) {
        this.initializationError = `Configuration errors: ${configValidation.errors.join(', ')}`;
        console.error('❌ Configuration validation failed:', configValidation);
        return false;
      }

      console.log('✅ Configuration validated successfully');

      // Load Google API và GIS scripts
      await Promise.all([
        this.loadGoogleAPIScript(),
        this.loadGoogleIdentityScript()
      ]);

      // Load gapi modules
      await this.loadGoogleModules();

      // Initialize gapi client
      await this.initializeGAPIClient();

      // Initialize Google Identity Services
      await this.initializeGoogleIdentity();

      this.isInitialized = true;
      console.log('✅ Google API fully initialized');
      return true;

    } catch (error) {
      this.initializationError = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('❌ Error initializing Google API:', {
        error: this.initializationError,
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  // Load Google API script
  private loadGoogleAPIScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        console.log('📚 Google API already loaded');
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="apis.google.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Script load failed')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('📥 Google API script loaded successfully');
        resolve();
      };

      script.onerror = () => {
        console.error('❌ Failed to load Google API script');
        reject(new Error('Failed to load Google API script'));
      };

      document.head.appendChild(script);
    });
  }

  // Load Google Identity Services script
  private loadGoogleIdentityScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts) {
        console.log('📚 Google Identity Services already loaded');
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="accounts.google.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('GIS script load failed')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('📥 Google Identity Services script loaded successfully');
        resolve();
      };

      script.onerror = () => {
        console.error('❌ Failed to load Google Identity Services script');
        reject(new Error('Failed to load Google Identity Services script'));
      };

      document.head.appendChild(script);
    });
  }

  // Load Google modules
  private loadGoogleModules(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout loading Google modules'));
      }, 10000);

      window.gapi.load('client', () => {
        clearTimeout(timeout);
        console.log('📚 Client module loaded');
        resolve();
      });
    });
  }

  // Initialize GAPI client
  private async initializeGAPIClient(): Promise<void> {
    try {
      console.log('🔧 Initializing GAPI client...');

      // Khởi tạo client đơn giản không dùng discovery docs
      await window.gapi.client.init({
        apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
        // Bỏ discoveryDocs để tránh lỗi 502
      });

      // Load Drive API manually với Promise wrapper để đảm bảo load thành công
      console.log('📥 Loading Drive API v3...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout loading Drive API'));
        }, 10000);

        window.gapi.client.load('drive', 'v3', () => {
          clearTimeout(timeout);
          console.log('✅ Drive API v3 loaded successfully');
          resolve();
        });
      });

      console.log('✅ GAPI client initialized successfully');
    } catch (error) {
      console.error('❌ GAPI client initialization failed:', error);

      // Fallback: Thử khởi tạo chỉ với API key
      try {
        console.log('🔄 Trying fallback initialization...');
        await window.gapi.client.init({
          apiKey: GOOGLE_DRIVE_CONFIG.API_KEY
        });

        // Load Drive API với timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout loading Drive API in fallback'));
          }, 10000);

          window.gapi.client.load('drive', 'v3', () => {
            clearTimeout(timeout);
            console.log('✅ Drive API loaded via fallback');
            resolve();
          });
        });

      } catch (fallbackError) {
        console.error('❌ Fallback initialization also failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Initialize Google Identity Services
  private async initializeGoogleIdentity(): Promise<void> {
    try {
      console.log('🔧 Initializing Google Identity Services...');

      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services not available');
      }

      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
        scope: GOOGLE_DRIVE_CONFIG.SCOPES,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('❌ Token response error:', tokenResponse.error);
            return;
          }

          this.accessToken = tokenResponse.access_token;
          console.log('✅ Access token received');
        },
      });

      console.log('✅ Google Identity Services initialized successfully');
    } catch (error) {
      console.error('❌ Google Identity Services initialization failed:', error);
      throw error;
    }
  }

  // Đăng nhập Google với GIS
  async signIn(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      console.log('🔑 Starting sign in process...');

      if (!this.isInitialized) {
        console.log('🔄 Initializing Google API first...');
        const initialized = await this.initializeGoogleAPI();
        if (!initialized) {
          throw new Error('Failed to initialize Google API');
        }
      }

      if (!this.tokenClient) {
        throw new Error('Token client not available');
      }

      console.log('🚪 Requesting access token...');

      return new Promise((resolve, reject) => {
        // Override callback để handle response
        this.tokenClient.callback = async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('❌ Token response error:', tokenResponse.error);

            if (tokenResponse.error === 'popup_closed_by_user') {
              resolve({ success: false, error: 'Popup đăng nhập đã bị đóng' });
            } else if (tokenResponse.error === 'access_denied') {
              resolve({ success: false, error: 'Người dùng từ chối quyền truy cập' });
            } else {
              resolve({ success: false, error: tokenResponse.error });
            }
            return;
          }

          try {
            this.accessToken = tokenResponse.access_token;
            console.log('✅ Access token received');

            // Set token cho gapi client
            window.gapi.client.setToken({
              access_token: this.accessToken
            });

            // Lấy thông tin user
            console.log('👤 Getting user information...');
            const userInfo = await this.getCurrentUser();
            console.log('✅ User info retrieved:', userInfo);

            // Lưu thông tin auth
            this.saveAuthInfo(userInfo);

            // Đảm bảo folder backup tồn tại
            console.log('📁 Ensuring backup folder exists...');
            await this.ensureBackupFolder();
            console.log('✅ Backup folder ready');

            console.log('🎉 Sign in process completed successfully');

            resolve({
              success: true,
              user: userInfo
            });
          } catch (error) {
            console.error('❌ Error processing sign in:', error);
            resolve({ success: false, error: `Lỗi xử lý đăng nhập: ${(error as Error).message}` });
          }
        };

        // Request access token
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      });

    } catch (error: any) {
      console.error('❌ Google sign in error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async getCurrentUser(): Promise<any> {
    try {
      console.log('🔍 Getting user info...');

      // Method 1: Sử dụng OAuth2 v2 API (đơn giản nhất)
      try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${this.accessToken}`);
        
        if (response.ok) {
          const userInfo = await response.json();
          console.log('✅ Got user info from OAuth2 v2:', userInfo);
          
          return {
            name: userInfo.name || userInfo.given_name || 'Google User',
            email: userInfo.email || 'user@gmail.com',
            picture: userInfo.picture || ''
          };
        }
      } catch (oauth2Error) {
        console.warn('OAuth2 v2 method failed:', oauth2Error);
      }

      // Method 2: Sử dụng token info endpoint
      try {
        const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.accessToken}`);
        
        if (response.ok) {
          const tokenInfo = await response.json();
          console.log('✅ Got user info from token info:', tokenInfo);
          
          return {
            name: tokenInfo.email?.split('@')[0] || 'Google User',
            email: tokenInfo.email || 'user@gmail.com',
            picture: ''
          };
        }
      } catch (tokenError) {
        console.warn('Token info method failed:', tokenError);
      }

      // Method 3: Sử dụng Drive API để lấy user info
      try {
        if (window.gapi?.client?.drive) {
          const response = await window.gapi.client.drive.about.get({
            fields: 'user'
          });
          
          if (response.result?.user) {
            const user = response.result.user;
            console.log('✅ Got user info from Drive API:', user);
            
            return {
              name: user.displayName || user.emailAddress?.split('@')[0] || 'Google User',
              email: user.emailAddress || 'user@gmail.com',
              picture: user.photoLink || ''
            };
          }
        }
      } catch (driveError) {
        console.warn('Drive API method failed:', driveError);
      }

      // Last resort: Return default info
      console.warn('All methods failed, using default user info');
      return {
        name: 'Google User',
        email: 'user@gmail.com',
        picture: ''
      };

    } catch (error) {
      console.error('Error getting user info:', error);
      
      // Return basic fallback
      return {
        name: 'Google User',
        email: 'user@gmail.com',
        picture: ''
      };
    }
  }

  // Kiểm tra trạng thái đăng nhập
  isSignedIn(): boolean {
    const hasToken = !!this.accessToken;
    const hasGapiToken = !!window.gapi?.client?.getToken();
    
    // Kiểm tra token có hết hạn không
    const authInfo = this.getAuthInfo();
    if (authInfo?.tokenExpiry && Date.now() > authInfo.tokenExpiry) {
      console.log('⏰ Token has expired');
      return false;
    }
    
    return hasToken && (hasGapiToken || !!authInfo?.accessToken);
  }

  // Tự động khôi phục kết nối khi cần thiết
  async ensureAuthenticated(): Promise<boolean> {
    // Nếu đã có token và chưa hết hạn
    if (this.isSignedIn()) {
      return true;
    }

    // Thử khôi phục từ localStorage
    const restored = await this.restoreAuthFromStorage();
    if (restored) {
      return true;
    }

    console.log('⚠️ Need to sign in again');
    return false;
  }

  // Validate configuration
  validateConfiguration(): { isValid: boolean; errors: string[]; details: any } {
    const errors: string[] = [];
    const details = GOOGLE_DRIVE_CONFIG.getDebugInfo();

    if (!GOOGLE_DRIVE_CONFIG.CLIENT_ID) {
      errors.push('CLIENT_ID is missing');
    } else if (!GOOGLE_DRIVE_CONFIG.CLIENT_ID.includes('.apps.googleusercontent.com')) {
      errors.push('CLIENT_ID format is invalid');
    }

    if (!GOOGLE_DRIVE_CONFIG.API_KEY) {
      errors.push('API_KEY is missing');
    } else if (!GOOGLE_DRIVE_CONFIG.API_KEY.startsWith('AIza')) {
      errors.push('API_KEY format is invalid');
    }


    if (!GOOGLE_DRIVE_CONFIG.SCOPES) {
      errors.push('SCOPES is missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      details
    };
  }

  // Tạo hoặc tìm thư mục backup
  private async ensureBackupFolder(): Promise<string> {
    try {
      if (!this.isSignedIn()) {
        throw new Error('Not signed in to Google Drive');
      }

      // Đảm bảo Google API đã được khởi tạo
      if (!this.isInitialized) {
        const initialized = await this.initializeGoogleAPI();
        if (!initialized) {
          throw new Error('Failed to initialize Google API');
        }
      }

      // Đảm bảo Drive API đã được load
      if (!window.gapi?.client?.drive) {
        console.log('🔄 Loading Drive API...');
        try {
          await window.gapi.client.load('drive', 'v3');
          console.log('✅ Drive API loaded successfully');
        } catch (error) {
          console.error('❌ Failed to load Drive API:', error);
          throw new Error('Failed to load Drive API');
        }
      }

      // Tìm thư mục hiện có
      const response = await window.gapi.client.drive.files.list({
        q: `name='${GOOGLE_DRIVE_CONFIG.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)'
      });

      if (response.result.files && response.result.files.length > 0) {
        this.folderId = response.result.files[0].id;
        return this.folderId!;
      }

      // Tạo thư mục mới
      const createResponse = await window.gapi.client.drive.files.create({
        resource: {
          name: GOOGLE_DRIVE_CONFIG.FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        }
      });

      this.folderId = createResponse.result.id;
      if (!this.folderId) {
        throw new Error('Failed to create backup folder');
      }

      return this.folderId;
    } catch (error) {
      console.error('Error ensuring backup folder:', error);
      throw error;
    }
  }

  // Lưu thông tin xác thực
  private saveAuthInfo(user: any): void {
    const authInfo = {
      accessToken: this.accessToken,
      user: user,
      lastSync: new Date().toISOString(),
      autoSyncEnabled: true,
      tokenExpiry: Date.now() + (3600 * 1000), // Token expires in 1 hour
      savedAt: new Date().toISOString()
    };

    localStorage.setItem('googleDriveAuth', JSON.stringify(authInfo));
    console.log('💾 Auth info saved to localStorage');
  }

  // Khôi phục thông tin xác thực khi load trang
  async restoreAuthFromStorage(): Promise<boolean> {
    try {
      const authInfo = this.getAuthInfo();
      if (!authInfo || !authInfo.accessToken) {
        console.log('ℹ️ No stored auth info found');
        return false;
      }

      // Kiểm tra token có hết hạn không
      if (authInfo.tokenExpiry && Date.now() > authInfo.tokenExpiry) {
        console.log('⏰ Stored token has expired');
        this.clearAuthInfo();
        return false;
      }

      console.log('🔄 Restoring auth from localStorage...');
      
      // Khôi phục access token
      this.accessToken = authInfo.accessToken;
      
      // Khởi tạo Google API nếu chưa
      if (!this.isInitialized) {  
        const initialized = await this.initializeGoogleAPI();
        if (!initialized) {
          console.error('❌ Failed to initialize Google API during restore');
          return false;
        }
      }

      // Set token cho gapi client
      if (window.gapi?.client) {
        window.gapi.client.setToken({
          access_token: this.accessToken
        });
      }

      // Test connection để đảm bảo token vẫn valid
      try {
        const testResult = await this.testConnection();
        if (testResult.success) {
          console.log('✅ Auth restored successfully from localStorage');
          return true;
        } else {
          console.log('❌ Stored token is invalid, clearing...');
          this.clearAuthInfo();
          return false;
        }
      } catch (error) {
        console.error('❌ Error testing restored connection:', error);
        this.clearAuthInfo();
        return false;
      }

    } catch (error) {
      console.error('❌ Error restoring auth:', error);
      this.clearAuthInfo();
      return false;
    }
  }

  // Xóa thông tin xác thực
  private clearAuthInfo(): void {
    localStorage.removeItem('googleDriveAuth');
  }

  // Lấy thông tin xác thực
  getAuthInfo(): any {
    try {
      const authInfo = localStorage.getItem('googleDriveAuth');
      return authInfo ? JSON.parse(authInfo) : null;
    } catch {
      return null;
    }
  }

  // Đăng xuất
  async signOut(): Promise<void> {
    try {
      // Stop auto backup timer
      this.stopAutoBackupTimer();

      if (this.accessToken) {
        // Revoke token
        await window.google.accounts.oauth2.revoke(this.accessToken);
      }

      // Clear gapi token
      if (window.gapi?.client) {
        window.gapi.client.setToken(null);
      }

      this.accessToken = null;
      this.folderId = null;
      this.clearAuthInfo();
      
      console.log('👋 Signed out successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  // Upload file lên Google Drive
  async uploadBackup(data: any, filename?: string): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      // Đảm bảo đã authenticated
      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        throw new Error('Not authenticated with Google Drive');
      }

      if (!this.folderId) {
        await this.ensureBackupFolder();
      }

      const fileName = filename || `restaurant-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileContent = JSON.stringify(data, null, 2);

      const metadata = {
        name: fileName,
        parents: [this.folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      this.updateLastSyncTime();
      console.log('✅ Backup uploaded successfully:', result.id);

      return { success: true, fileId: result.id };
    } catch (error) {
      console.error('❌ Upload backup error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Lấy danh sách backup
  async listBackups(): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      // Đảm bảo đã authenticated
      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        throw new Error('Not authenticated with Google Drive');
      }

      if (!this.folderId) {
        await this.ensureBackupFolder();
      }

      const response = await window.gapi.client.drive.files.list({
        q: `'${this.folderId}' in parents and trashed=false`,
        fields: 'files(id, name, modifiedTime, size)',
        orderBy: 'modifiedTime desc'
      });

      return { success: true, files: response.result.files || [] };
    } catch (error) {
      console.error('List backups error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Download backup
  async downloadBackup(fileId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Đảm bảo đã authenticated
      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        throw new Error('Not authenticated with Google Drive');
      }

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const jsonText = await response.text();
      const data = JSON.parse(jsonText);

      return { success: true, data };
    } catch (error) {
      console.error('Download backup error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Xóa backup cũ
  async deleteOldBackups(keepCount = 10): Promise<void> {
    try {
      const backupsResult = await this.listBackups();
      if (!backupsResult.success || !backupsResult.files) return;

      const filesToDelete = backupsResult.files.slice(keepCount);

      for (const file of filesToDelete) {
        try {
          await window.gapi.client.drive.files.delete({
            fileId: file.id
          });
        } catch (error) {
          console.error(`Error deleting file ${file.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error deleting old backups:', error);
    }
  }

  // Cập nhật thời gian sync
  private updateLastSyncTime(): void {
    const authInfo = this.getAuthInfo();
    if (authInfo) {
      authInfo.lastSync = new Date().toISOString();
      localStorage.setItem('googleDriveAuth', JSON.stringify(authInfo));
    }
  }

  // Kiểm tra cần sync tự động
  shouldAutoSync(): boolean {
    const authInfo = this.getAuthInfo();
    if (!authInfo || !authInfo.autoSyncEnabled) {
      console.log('ℹ️ Auto sync is disabled');
      return false;
    }

    if (!authInfo.lastSync) {
      console.log('📅 No previous sync found, should sync now');
      return true;
    }

    const lastSync = new Date(authInfo.lastSync);
    const now = new Date();
    const daysSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60 * 24);

    console.log(`📊 Days since last sync: ${daysSinceLastSync.toFixed(2)}`);
    return daysSinceLastSync >= 1;
  }

  // Khởi tạo auto backup timer
  startAutoBackupTimer(): void {
    if (typeof window === 'undefined') return;

    console.log('⏰ Starting auto backup timer...');

    // Clear existing timer nếu có
    if ((window as any).googleDriveAutoBackupTimer) {
      clearInterval((window as any).googleDriveAutoBackupTimer);
    }

    // Check mỗi 1 giờ
    (window as any).googleDriveAutoBackupTimer = setInterval(async () => {
      console.log('🔄 Auto backup check...');
      
      if (await this.ensureAuthenticated() && this.shouldAutoSync()) {
        console.log('🚀 Starting auto backup...');
        try {
          // Import AuthUtils để gọi auto backup
          const { default: AuthUtils } = await import('@/utils/authUtils');
          const result = await AuthUtils.autoBackupToGoogleDrive();
          
          if (result.success) {
            console.log('✅ Auto backup completed successfully');
          } else {
            console.error('❌ Auto backup failed:', result.message);
          }
        } catch (error) {
          console.error('❌ Auto backup error:', error);
        }
      }
    }, 60 * 60 * 1000); // Mỗi 1 giờ

    // Kiểm tra ngay khi khởi động (sau 30 giây)
    setTimeout(async () => {
      console.log('🔄 Initial auto backup check...');
      if (await this.ensureAuthenticated() && this.shouldAutoSync()) {
        console.log('🚀 Starting initial auto backup...');
        try {
          const { default: AuthUtils } = await import('@/utils/authUtils');
          const result = await AuthUtils.autoBackupToGoogleDrive();
          
          if (result.success) {
            console.log('✅ Initial auto backup completed successfully');
          } else {
            console.error('❌ Initial auto backup failed:', result.message);
          }
        } catch (error) {
          console.error('❌ Initial auto backup error:', error);
        }
      }
    }, 30000); // 30 giây sau khi load
  }

  // Stop auto backup timer
  stopAutoBackupTimer(): void {
    if (typeof window !== 'undefined' && (window as any).googleDriveAutoBackupTimer) {
      clearInterval((window as any).googleDriveAutoBackupTimer);
      (window as any).googleDriveAutoBackupTimer = null;
      console.log('⏹️ Auto backup timer stopped');
    }
  }

  // Bật/tắt tự động sync
  setAutoSync(enabled: boolean): void {
    const authInfo = this.getAuthInfo();
    if (authInfo) {
      authInfo.autoSyncEnabled = enabled;
      localStorage.setItem('googleDriveAuth', JSON.stringify(authInfo));
      console.log(`🔄 Auto sync ${enabled ? 'enabled' : 'disabled'}`);
    }

    if (enabled) {
      this.startAutoBackupTimer();
    } else {
      this.stopAutoBackupTimer();
    }
  }

  // Get debug info
  getDebugInfo(): any {
    return {
      isInitialized: this.isInitialized,
      hasAccessToken: !!this.accessToken,
      hasFolderId: !!this.folderId,
      hasTokenClient: !!this.tokenClient,
      initializationError: this.initializationError,
      hasGapi: typeof window !== 'undefined' && !!window.gapi,
      hasGapiClient: typeof window !== 'undefined' && !!window.gapi?.client,
      hasDriveAPI: typeof window !== 'undefined' && !!window.gapi?.client?.drive,
      hasGoogleIdentity: typeof window !== 'undefined' && !!window.google?.accounts,
      gapiClientToken: typeof window !== 'undefined' && window.gapi?.client ? window.gapi.client.getToken() : null,
      config: this.getConfigDebugInfo()
    };
  }

  // Get config debug info
  private getConfigDebugInfo(): any {
    return {
      hasClientId: !!GOOGLE_DRIVE_CONFIG.CLIENT_ID,
      hasApiKey: !!GOOGLE_DRIVE_CONFIG.API_KEY,
      clientIdLength: GOOGLE_DRIVE_CONFIG.CLIENT_ID?.length || 0,
      apiKeyLength: GOOGLE_DRIVE_CONFIG.API_KEY?.length || 0,
      folderName: GOOGLE_DRIVE_CONFIG.FOLDER_NAME,
      scopes: GOOGLE_DRIVE_CONFIG.SCOPES
    };
  }

  // Get initialization error
  getInitializationError(): string | null {
    return this.initializationError;
  }

  // Force reinitialize
  async forceReinitialize(): Promise<boolean> {
    console.log('🔄 Force reinitializing Google API...');
    this.isInitialized = false;
    this.tokenClient = null;
    this.accessToken = null;
    this.initializationError = null;

    return await this.initializeGoogleAPI();
  }

  // Sync latest data from Google Drive
  async syncLatestData(): Promise<boolean> {
    try {
      console.log('🔄 Syncing latest data from Google Drive...');
      
      // Đảm bảo đã authenticated
      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        console.error('❌ Not authenticated with Google Drive');
        return false;
      }

      // Lấy danh sách backup files
      const backupsResult = await this.listBackups();
      if (!backupsResult.success || !backupsResult.files || backupsResult.files.length === 0) {
        console.log('ℹ️ No backup files found');
        return false;
      }

      // Lấy file backup mới nhất
      const latestBackup = backupsResult.files[0]; // Đã được sắp xếp theo modifiedTime desc
      console.log(`📥 Downloading latest backup: ${latestBackup.name}`);

      // Download backup mới nhất
      const downloadResult = await this.downloadBackup(latestBackup.id);
      if (!downloadResult.success || !downloadResult.data) {
        console.error('❌ Failed to download latest backup');
        return false;
      }

      // Restore dữ liệu vào localStorage
      try {
        const data = downloadResult.data;
        
        // Kiểm tra cấu trúc dữ liệu
        if (typeof data === 'object' && data !== null) {
          // Restore từng bảng dữ liệu
          Object.keys(data).forEach(tableName => {
            if (Array.isArray(data[tableName])) {
              localStorage.setItem(tableName, JSON.stringify(data[tableName]));
              console.log(`✅ Restored ${data[tableName].length} records for table: ${tableName}`);
            }
          });

          // Cập nhật thời gian sync
          this.updateLastSyncTime();
          
          console.log('✅ Successfully synced latest data from Google Drive');
          return true;
        } else {
          console.error('❌ Invalid data structure in backup');
          return false;
        }
      } catch (error) {
        console.error('❌ Error restoring data to localStorage:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error syncing latest data:', error);
      return false;
    }
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initializeGoogleAPI();
        if (!initialized) {
          return {
            success: false,
            message: 'Failed to initialize Google API',
            details: this.getDebugInfo()
          };
        }
      }

      if (!this.isSignedIn()) {
        return {
          success: false,
          message: 'Not signed in',
          details: this.getDebugInfo()
        };
      }

      // Đảm bảo Drive API đã được load
      if (!window.gapi?.client?.drive) {
        console.log('🔄 Loading Drive API for test...');
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Timeout loading Drive API for test'));
            }, 10000);

            window.gapi.client.load('drive', 'v3', () => {
              clearTimeout(timeout);
              console.log('✅ Drive API loaded for test');
              resolve();
            });
          });
        } catch (error) {
          return {
            success: false,
            message: 'Failed to load Drive API for test',
            details: this.getDebugInfo()
          };
        }
      }

      // Test basic API call
      const response = await window.gapi.client.drive.about.get({
        fields: 'user'
      });

      return {
        success: true,
        message: 'Connection successful',
        details: {
          user: response.result.user,
          debug: this.getDebugInfo()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        details: this.getDebugInfo()
      };
    }
  }
}

export default new GoogleDriveUtils();