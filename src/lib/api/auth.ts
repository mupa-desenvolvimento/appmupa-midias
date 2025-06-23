import { API_CONFIG, TOKEN_STORAGE_KEY, TOKEN_EXPIRY_KEY } from './config';

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface GroupsResponse {
  success: boolean;
  message?: string;
  data?: {
    response: {
      grupos: Array<{
        _id: string;
        nome: string;
        [key: string]: any;
      }>;
    };
  };
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type?: string;
}

export class AuthService {
  private static token = '9c264e50ddb95a215b446412a3b42b58';

  private static async getToken(): Promise<string> {
    // Simplificado para sempre retornar o token estático da Mupa.
    return this.token;
  }

  public static async getAuthHeader(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    };
  }

  public static async postCodUser(codUser: string): Promise<AuthResponse> {
    try {
      console.log('Enviando codUser para API via proxy:', codUser);
      
      const response = await fetch(`/mupa-api/1.1/wf/post-cod-user?cod-user=${codUser}`, {
        method: 'GET',
        headers: await this.getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Resposta da API codUser:', data);
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Erro ao enviar codUser:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // Busca os grupos de uma empresa
  public static async getGroups(empresaId: string): Promise<GroupsResponse> {
    const endpoint = `/mupa-api/1.1/wf/get_grupos?empresa_id=${empresaId}`;
    console.log(`Buscando grupos para a empresa: ${empresaId} via proxy no endpoint: ${endpoint}`);

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: await this.getAuthHeader(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Resposta da API getGroups:', data);
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}