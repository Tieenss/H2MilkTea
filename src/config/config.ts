const config = {
 
    IMGBB_API_KEY: process.env.NEXT_PUBLIC_IMGBB_API_KEY,
    CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUD_NAME,
    UPLOAD_PRESET: process.env.NEXT_PUBLIC_UPLOAD_PRESET,
    
  
    
    ROUTES: {
        LOGIN: '/',
        DASHBOARD: '/dashboard',
        PROFILE: '/profile',
        DSNV : '/dsnv',
        PRODUCTS: '/products',
        TABLES: '/tables',
        ORDERS: '/orders',
        THUCHI: '/thuchi',
    },
    
    AUTH: {
        TOKEN_KEY: 'authToken',
        USER_DATA_KEY: 'userData',
        TOKEN_EXPIRY_KEY: 'tokenExpiry',
        TOKEN_DURATION: parseInt(process.env.NEXT_PUBLIC_TOKEN_DURATION || '86400000')
    },
    
    UPLOAD: {
        MAX_SIZE: parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || '5242880'),
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
        IMGBB_URL: process.env.NEXT_PUBLIC_IMGBB_URL
    }
};

export default config;