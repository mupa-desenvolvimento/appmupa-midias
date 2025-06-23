import { AuthService } from './auth';

export interface Media {
  _id: string;
  url: string;
  type: 'video' | 'image';
  duration?: number;
  // Adicionar outros campos que venham da API
  [key: string]: any;
}

export interface MediasResponse {
  success: boolean;
  message?: string;
  data?: {
    response: {
      medias: Media[];
    }
  };
}

export class MediaService {
  public static async getMediasByGroupId(groupId: string): Promise<MediasResponse> {
    const cacheBuster = `&_=${new Date().getTime()}`;
    const endpoint = `https://mupa.app/api/1.1/wf/get_medias_?_id=${groupId}${cacheBuster}`;
    console.log(`Buscando mídias para o grupo: ${groupId} via endpoint: ${endpoint}`);

    try {
      // Reutiliza o token da AuthService
      const headers = await AuthService.getAuthHeader();

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Resposta da API getMedias:', data);

      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('Erro ao buscar mídias:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        success: false,
        message: errorMessage,
      };
    }
  }
} 