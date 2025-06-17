export const API_CONFIG = {
  BASE_URL: 'https://api.zaffari.com.br',
  AUTH_ENDPOINT: '/auth',
  PRODUCTS_ENDPOINT: '/products',
  CLIENT_ID: import.meta.env.VITE_ZAFFARI_CLIENT_ID,
  CLIENT_SECRET: import.meta.env.VITE_ZAFFARI_CLIENT_SECRET,
} as const;

export const TOKEN_STORAGE_KEY = 'zaffari_token';
export const TOKEN_EXPIRY_KEY = 'zaffari_token_expiry'; 