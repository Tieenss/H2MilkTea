// Server-side only imports
let fs: any = null;
let path: any = null;

// Only import Node.js modules on server-side
if (typeof window === 'undefined') {
  try {
    const fsModule = require('fs/promises');
    const pathModule = require('path');
    fs = fsModule;
    path = pathModule;
  } catch (error) {
    console.warn('Node.js modules not available:', error);
  }
}

// Import environment configuration
import { envConfig, DATA_DIR, BACKUP_DIR, MAX_BACKUP_AGE, MAX_FILE_SIZE } from '@/config/environment';

// Types
export interface FileMetadata {
  tableName: string;
  timestamp: string;
  recordCount: number;
  fileSize: number;
  backup: boolean;
  type?: 'auto' | 'manual' | 'pre-restore';
}

export interface BackupInfo {
  fileName: string;
  filePath: string;
  metadata: FileMetadata;
  createdAt: Date;
}

export interface SaveOptions {
  backup?: boolean;
  compress?: boolean;
  validate?: boolean;
  metadata?: Partial<FileMetadata>;
}

export class JsonFileManager {
  private static instance: JsonFileManager;
  private isInitialized = false;

  static getInstance(): JsonFileManager {
    if (!JsonFileManager.instance) {
      JsonFileManager.instance = new JsonFileManager();
    }
    return JsonFileManager.instance;
  }

  private constructor() {}

  // Check if running on server-side
  private isServer(): boolean {
    return typeof window === 'undefined' && fs !== null;
  }

  // Initialize directories
  async initialize(): Promise<void> {
    if (this.isInitialized || !this.isServer()) return;

    try {
      console.log('🔧 Initializing JsonFileManager...');
      console.log('Environment:', {
        isServerless: envConfig.isServerless,
        dataDir: DATA_DIR,
        backupDir: BACKUP_DIR,
        cwd: process.cwd()
      });
      
      await this.ensureDirectories();
      await this.cleanupOldBackups();
      this.isInitialized = true;
      console.log('✅ JsonFileManager initialized');
    } catch (error) {
      console.error('❌ JsonFileManager initialization failed:', error);
      // Don't throw error in serverless environment
      if (envConfig.isServerless) {
        console.warn('⚠️ Continuing without file system access in serverless environment');
        this.isInitialized = true;
      } else {
        throw error;
      }
    }
  }

  // Save data to JSON file
  async saveData<T>(
    tableName: string,
    data: T[],
    options: SaveOptions = {}
  ): Promise<{ success: boolean; filePath: string; metadata: FileMetadata }> {
    if (!this.isServer()) {
      throw new Error('JsonFileManager chỉ hoạt động trên server-side');
    }

    await this.initialize();

    const { backup = false, compress = false, validate = true, metadata = {} } = options;

    try {
      // Validate data
      if (validate) {
        this.validateData(data);
      }

      const timestamp = new Date().toISOString();
      const fileName = `${tableName.toUpperCase()}.json`;
      
      let filePath: string;
      let finalData: any;

      if (backup) {
        // Create backup with timestamp
        if (!BACKUP_DIR) {
          throw new Error('Backup directory không khả dụng');
        }
        const backupFileName = `${tableName.toUpperCase()}_${timestamp.replace(/[:.]/g, '-')}.json`;
        filePath = path.join(BACKUP_DIR, backupFileName);
        
        finalData = {
          metadata: {
            tableName,
            timestamp,
            recordCount: data.length,
            backup: true,
            type: metadata.type || 'manual',
            ...metadata
          },
          data
        };
      } else {
        // Save to main data directory
        if (!DATA_DIR) {
          throw new Error('Data directory không khả dụng');
        }
        filePath = path.join(DATA_DIR, fileName);
        finalData = data;
      }

      // Compress if requested
      if (compress) {
        finalData = await this.compressData(finalData);
      }

      // Write file
      const jsonString = JSON.stringify(finalData, null, 2);
      await fs.writeFile(filePath, jsonString, 'utf8');

      // Get file stats
      const stats = await fs.stat(filePath);
      
      const fileMetadata: FileMetadata = {
        tableName,
        timestamp,
        recordCount: data.length,
        fileSize: stats.size,
        backup,
        type: metadata.type || 'manual'
      };

      // Create auto backup if not already a backup
      if (!backup) {
        await this.createAutoBackup(tableName, data, timestamp);
      }

      console.log(`✅ Đã lưu ${tableName}: ${data.length} records (${(stats.size / 1024).toFixed(2)}KB)`);

      return {
        success: true,
        filePath,
        metadata: fileMetadata
      };

    } catch (error) {
      console.error(`❌ Lỗi lưu ${tableName}:`, error);
      throw error;
    }
  }

  // Load data from JSON file
  async loadData<T>(tableName: string): Promise<T[]> {
    if (!this.isServer()) {
      throw new Error('JsonFileManager chỉ hoạt động trên server-side');
    }

    await this.initialize();

    try {
      if (!DATA_DIR) {
        throw new Error('Data directory không khả dụng');
      }
      
      const filePath = path.join(DATA_DIR, `${tableName.toUpperCase()}.json`);
      
      if (!await this.fileExists(filePath)) {
        throw new Error(`File không tồn tại: ${tableName}`);
      }

      const fileContent = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      // Handle backup format
      if (data.metadata && data.data) {
        return data.data;
      }

      return data;
    } catch (error) {
      console.error(`❌ Lỗi load ${tableName}:`, error);
      throw error;
    }
  }

  // Client-side method to fetch data from JSON files
  static async fetchDataFromJson<T>(fileName: string): Promise<T[]> {
    try {
      const response = await fetch(`/data/${fileName}.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${fileName}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ${fileName}:`, error);
      throw error;
    }
  }

  // List all available tables
  async listTables(): Promise<string[]> {
    if (!this.isServer()) {
      return [];
    }

    await this.initialize();

    try {
      if (!DATA_DIR || !await this.fileExists(DATA_DIR)) {
        return [];
      }
      
      const files = await fs.readdir(DATA_DIR);
      return files
        .filter((file: string) => file.endsWith('.json'))
        .map((file: string) => file.replace('.json', ''))
        .filter((table: string) => !table.includes('_backup'));
    } catch (error) {
      console.error('❌ Lỗi liệt kê tables:', error);
      return [];
    }
  }

  // List all backups
  async listBackups(tableName?: string): Promise<BackupInfo[]> {
    if (!this.isServer()) {
      return [];
    }

    await this.initialize();

    try {
      if (!BACKUP_DIR || !await this.fileExists(BACKUP_DIR)) {
        return [];
      }

      const files = await fs.readdir(BACKUP_DIR);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);

        // Filter by table name if specified
        if (tableName && !file.includes(tableName.toUpperCase())) {
          continue;
        }

        try {
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);

          if (data.metadata) {
            backups.push({
              fileName: file,
              filePath,
              metadata: data.metadata,
              createdAt: new Date(data.metadata.timestamp)
            });
          }
        } catch (error) {
          console.warn(`⚠️ Không thể đọc backup file: ${file}`);
        }
      }

      // Sort by creation date (newest first)
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('❌ Lỗi liệt kê backups:', error);
      return [];
    }
  }

  // Restore from backup
  async restoreFromBackup(backupFileName: string): Promise<{ success: boolean; message: string }> {
    if (!this.isServer()) {
      return { success: false, message: 'Chỉ hoạt động trên server-side' };
    }

    await this.initialize();

    try {
      if (!BACKUP_DIR) {
        throw new Error('Backup directory không khả dụng');
      }
      
      const backupPath = path.join(BACKUP_DIR, backupFileName);
      
      if (!await this.fileExists(backupPath)) {
        throw new Error(`Backup file không tồn tại: ${backupFileName}`);
      }

      const content = await fs.readFile(backupPath, 'utf8');
      const backupData = JSON.parse(content);

      if (!backupData.metadata || !backupData.data) {
        throw new Error('File backup không đúng định dạng');
      }

      const { tableName } = backupData.metadata;
      
      // Create backup of current data before restore
      const currentData = await this.loadData(tableName).catch(() => []);
      if (currentData.length > 0) {
        await this.saveData(tableName, currentData, { 
          backup: true, 
          metadata: { type: 'pre-restore' } 
        });
      }

      // Restore data
      await this.saveData(tableName, backupData.data);

      return {
        success: true,
        message: `Đã khôi phục ${backupData.data.length} records từ backup`
      };

    } catch (error) {
      console.error('❌ Lỗi restore backup:', error);
      return {
        success: false,
        message: `Lỗi khôi phục: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`
      };
    }
  }

  // Cleanup old backups
  async cleanupOldBackups(maxAge: number = MAX_BACKUP_AGE): Promise<number> {
    if (!this.isServer()) {
      return 0;
    }

    await this.initialize();

    try {
      if (!BACKUP_DIR) {
        console.warn('⚠️ Backup directory không khả dụng, bỏ qua cleanup');
        return 0;
      }
      
      const backups = await this.listBackups();
      const cutoffTime = Date.now() - maxAge;
      let deletedCount = 0;

      for (const backup of backups) {
        if (backup.createdAt.getTime() < cutoffTime) {
          try {
            await fs.unlink(backup.filePath);
            deletedCount++;
            console.log(`🗑️ Đã xóa backup cũ: ${backup.fileName}`);
          } catch (error) {
            console.error(`❌ Lỗi xóa backup: ${backup.fileName}`, error);
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('❌ Lỗi cleanup backups:', error);
      return 0;
    }
  }

  // Get file statistics
  async getFileStats(tableName: string): Promise<{ exists: boolean; size?: number; lastModified?: Date }> {
    if (!this.isServer()) {
      return { exists: false };
    }

    await this.initialize();

    try {
      if (!DATA_DIR) {
        return { exists: false };
      }
      
      const filePath = path.join(DATA_DIR, `${tableName.toUpperCase()}.json`);
      
      if (!await this.fileExists(filePath)) {
        return { exists: false };
      }

      const stats = await fs.stat(filePath);
      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime
      };
    } catch (error) {
      console.error(`❌ Lỗi get stats cho ${tableName}:`, error);
      return { exists: false };
    }
  }

  // Helper methods
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private validateData(data: any[]): void {
    if (!Array.isArray(data)) {
      throw new Error('Data phải là array');
    }

    if (data.length === 0) {
      throw new Error('Data không được rỗng');
    }

    // Check for duplicate IDs if objects have ID fields
    const ids = new Set();
    for (const item of data) {
      if (item.ID || item.id) {
        const id = item.ID || item.id;
        if (ids.has(id)) {
          throw new Error(`Duplicate ID found: ${id}`);
        }
        ids.add(id);
      }
    }
  }

  private async compressData(data: any): Promise<any> {
    // In a real implementation, you might use zlib or other compression
    return data;
  }

  private async createAutoBackup<T>(tableName: string, data: T[], timestamp: string): Promise<void> {
    try {
      // Skip auto backup if disabled or in serverless environment
      if (!envConfig.enableAutoBackup || !BACKUP_DIR) {
        if (envConfig.isServerless) {
          console.log('📦 Auto backup disabled in serverless environment');
        } else {
          console.warn('⚠️ Backup directory không khả dụng, bỏ qua auto backup');
        }
        return;
      }
      
      const backupFileName = `${tableName.toUpperCase()}_auto_${timestamp.replace(/[:.]/g, '-')}.json`;
      const backupPath = path.join(BACKUP_DIR, backupFileName);
      
      const backupData = {
        metadata: {
          tableName,
          timestamp,
          recordCount: data.length,
          backup: true,
          type: 'auto'
        },
        data
      };

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      console.log(`📦 Auto backup created: ${backupFileName}`);
    } catch (error) {
      console.error('❌ Lỗi tạo auto backup:', error);
    }
  }

  private async ensureDirectories(): Promise<void> {
    if (!this.isServer()) return;
    
    const dirs = [DATA_DIR, BACKUP_DIR];
    
    for (const dir of dirs) {
      if (dir && !await this.fileExists(dir)) {
        try {
          await fs.mkdir(dir, { recursive: true });
          console.log(`✅ Created directory: ${dir}`);
        } catch (error) {
          console.error(`❌ Failed to create directory ${dir}:`, error);
          // In serverless environments, we might not be able to create directories
          // This is expected behavior
        }
      }
    }
  }
}

// Export singleton instance
export const jsonFileManager = JsonFileManager.getInstance(); 