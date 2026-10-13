// Environment configuration
export interface EnvironmentConfig {
  isServerless: boolean;
  dataDir: string;
  backupDir: string;
  maxFileSize: number;
  maxBackupAge: number;
  enableAutoBackup: boolean;
  enableCompression: boolean;
}

// Detect environment
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const isDevelopment = process.env.NODE_ENV === 'development';

// Get data directory based on environment
const getDataDir = (): string => {
  if (typeof window !== 'undefined') return '';
  
  if (isServerless) {
    // Use /tmp for serverless environments
    return '/tmp/data';
  }
  
  // Use project directory for regular server environments
  return process.cwd() + '/data';
};

// Get backup directory
const getBackupDir = (): string => {
  const dataDir = getDataDir();
  return dataDir ? `${dataDir}/backups` : '';
};

// Environment configuration
export const envConfig: EnvironmentConfig = {
  isServerless,
  dataDir: getDataDir(),
  backupDir: getBackupDir(),
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxBackupAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableAutoBackup: !isServerless, // Disable auto backup in serverless
  enableCompression: false
};

// Log environment info
if (typeof window === 'undefined') {
  console.log('🌍 Environment Configuration:', {
    isServerless: envConfig.isServerless,
    isDevelopment,
    dataDir: envConfig.dataDir,
    backupDir: envConfig.backupDir,
    enableAutoBackup: envConfig.enableAutoBackup
  });
}

// Export constants for backward compatibility
export const DATA_DIR = envConfig.dataDir;
export const BACKUP_DIR = envConfig.backupDir;
export const MAX_BACKUP_AGE = envConfig.maxBackupAge;
export const MAX_FILE_SIZE = envConfig.maxFileSize; 