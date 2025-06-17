import { API_CONFIG } from './config';
import { AuthService } from './auth';

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  // Adicione outros campos conforme necessário
}

export class ProductService {
  public static async searchProducts(query: string): Promise<Product[]> {
    try {
      const headers = await AuthService.getAuthHeader();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.PRODUCTS_ENDPOINT}/search?q=${encodeURIComponent(query)}`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao buscar produtos');
      }

      const data = await response.json();
      return data.products;
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw error;
    }
  }

  public static async getProductById(id: string): Promise<Product> {
    try {
      const headers = await AuthService.getAuthHeader();
      
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.PRODUCTS_ENDPOINT}/${id}`,
        {
          headers,
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao buscar produto');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      throw error;
    }
  }
} 