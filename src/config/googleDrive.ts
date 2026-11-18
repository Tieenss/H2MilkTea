// config/googleDrive.ts

type ClientIdChangeListener = (newClientId: string) => void;
const clientIdListeners = new Set<ClientIdChangeListener>();

export const GOOGLE_DRIVE_CONFIG = {
  get CLIENT_ID(): string {
    if (typeof window !== 'undefined') {
      const customId = localStorage.getItem('h2_custom_google_client_id');
      if (customId && customId.trim()) return customId.trim();
    }
    return process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '';
  },

  onClientIdChange(listener: ClientIdChangeListener): () => void {
    clientIdListeners.add(listener);
    return () => {
      clientIdListeners.delete(listener);
    };
  },

  notifyClientIdChange(newId: string) {
    clientIdListeners.forEach((listener) => {
      try {
        listener(newId);
      } catch (err) {
        console.error('Error notifying Google Client ID listener:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('h2-google-client-id-changed', {
          detail: { clientId: newId },
        })
      );
    }
  },

  setCustomClientId(id: string) {
    const trimmed = id.trim();
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('h2_custom_google_client_id', trimmed);
      } else {
        localStorage.removeItem('h2_custom_google_client_id');
      }
    }
    this.notifyClientIdChange(trimmed);
  },

  clearCustomClientId() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('h2_custom_google_client_id');
    }
    this.notifyClientIdChange(process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || '');
  },

  SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  FOLDER_NAME: 'H2MilkTea_Backups',

  isValid(): boolean {
    const cid = this.CLIENT_ID;
    return !!(cid && cid.trim().length > 10 && cid.includes('.apps.googleusercontent.com'));
  },

  getDebugInfo(): any {
    const cid = this.CLIENT_ID;
    return {
      hasClientId: !!(cid && cid.trim()),
      clientIdLength: cid?.length || 0,
      clientIdPreview: cid ? `${cid.substring(0, 15)}...${cid.substring(cid.length - 10)}` : 'Chưa thiết lập',
      isValidClientId: this.isValid(),
      envSet: !!process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID,
      customSet: typeof window !== 'undefined' ? !!localStorage.getItem('h2_custom_google_client_id') : false,
    };
  },
};
