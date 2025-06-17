import { API_CONFIG, TOKEN_STORAGE_KEY, TOKEN_EXPIRY_KEY } from './config';

interface AuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class AuthService {
  private static async getToken(): Promise<string> {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const tokenExpiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (storedToken && tokenExpiry && new Date().getTime() < parseInt(tokenExpiry)) {
      return storedToken;
    }

    return this.refreshToken();
  }

  private static async refreshToken(): Promise<string> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: API_CONFIG.CLIENT_ID!,
          client_secret: API_CONFIG.CLIENT_SECRET!,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na autenticação');
      }

      const data: AuthResponse = await response.json();
      
      // Salva o token e sua data de expiração
      const expiryTime = new Date().getTime() + (data.expires_in * 1000);
      localStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

      return data.access_token;
    } catch (error) {
      console.error('Erro ao obter token:', error);
      throw error;
    }
  }

  public static async getAuthHeader(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }
} 