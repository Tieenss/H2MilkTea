// config/googleDrive.ts
export const GOOGLE_DRIVE_CONFIG = {
  CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '',
  API_KEY: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY || '',
  // Bỏ DISCOVERY_DOC vì đang gặp lỗi 502
  SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  FOLDER_NAME: 'Restaurant_Data_Backup',
  
  isValid(): boolean {
    const hasClientId = !!(this.CLIENT_ID && this.CLIENT_ID.trim());
    const hasApiKey = !!(this.API_KEY && this.API_KEY.trim());
    const isValidClientId = this.CLIENT_ID.includes('.apps.googleusercontent.com');
    const isValidApiKey = this.API_KEY.startsWith('AIza');
    
    return hasClientId && hasApiKey && isValidClientId && isValidApiKey;
  },
  
  getDebugInfo(): any {
    return {
      hasClientId: !!(this.CLIENT_ID && this.CLIENT_ID.trim()),
      hasApiKey: !!(this.API_KEY && this.API_KEY.trim()),
      clientIdLength: this.CLIENT_ID?.length || 0,
      apiKeyLength: this.API_KEY?.length || 0,
      clientIdPreview: this.CLIENT_ID?.substring(0, 20) + '...',
      apiKeyPreview: this.API_KEY?.substring(0, 10) + '...',
      isValidClientId: this.CLIENT_ID?.includes('.apps.googleusercontent.com') || false,
      isValidApiKey: this.API_KEY?.startsWith('AIza') || false,
      isValid: this.isValid(),
      envVars: {
        CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID ? 'Set' : 'Not Set',
        API_KEY: process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY ? 'Set' : 'Not Set'
      }
    };
  }
};