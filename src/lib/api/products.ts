import { API_CONFIG } from './config';
import { AuthService } from './auth';
import { ConfigManager } from '../config';

export interface Product {
  codbar: string;
  descricao: string;
  exibicao: {
    cor_fundo: string;
    estilo: string;
    texto_destaque: string;
    texto_primario: string;
    texto_secundario: string;
  };
  imagem_url: string;
  preco_principal: number;
  preco_secundario: number | null;
  tem_promocao: boolean;
  texto_detalhes: string;
  tipo_oferta: string;
  tipo_preco: string;
  valor_oferta_calculado: number;
}

// Nova interface para o formato de resposta do novo endpoint
export interface NewProductResponse {
  ean: string;
  price: number;
  offer: number;
  description: string;
  image: string | null;
}

export interface AudioResponse {
  audio_hash: string;
  audio_url: string;
  texto: string;
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

  public static async getProductByBarcode(barcode: string): Promise<Product> {
    try {
      console.log('Buscando produto no novo endpoint:', barcode);
      
      // Usar o novo endpoint fixo
      const response = await fetch(
        `http://192.168.3.50:5015/api/produtos?ean=${barcode}`
      );

      if (!response.ok) {
        throw new Error('Falha ao buscar produto');
      }

      const newProductData: NewProductResponse = await response.json();
      console.log('Resposta do novo endpoint:', newProductData);

      // Converter o novo formato para o formato esperado pelo sistema
      const isOnSale = newProductData.offer > 0 && newProductData.offer < newProductData.price;
      
      // Formatar a descrição: primeira letra maiúscula, resto minúscula
      const formattedDescription = newProductData.description.charAt(0).toUpperCase() + 
                                 newProductData.description.slice(1).toLowerCase();

      const product: Product = {
        codbar: newProductData.ean,
        descricao: formattedDescription,
        exibicao: {
          cor_fundo: isOnSale ? '#ff0000' : '#ffffff', // Vermelho se em oferta, branco se não
          estilo: isOnSale ? 'oferta' : 'normal',
          texto_destaque: isOnSale ? 'OFERTA' : '',
          texto_primario: isOnSale ? `DE R$ ${newProductData.price.toFixed(2)}` : `R$ ${newProductData.price.toFixed(2)}`,
          texto_secundario: isOnSale ? `POR R$ ${newProductData.offer.toFixed(2)}` : '',
        },
        imagem_url: newProductData.image || '',
        preco_principal: isOnSale ? newProductData.offer : newProductData.price,
        preco_secundario: isOnSale ? newProductData.price : null,
        tem_promocao: isOnSale,
        texto_detalhes: formattedDescription,
        tipo_oferta: isOnSale ? 'DE' : '',
        tipo_preco: isOnSale ? 'POR' : 'NORMAL',
        valor_oferta_calculado: isOnSale ? newProductData.offer : newProductData.price,
      };

      return product;
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      
      // Mock para teste quando o endpoint não estiver disponível
      console.log('Usando mock para teste...');
      const mockData: NewProductResponse = {
        ean: barcode,
        price: 31.99,
        offer: 25.99, // Produto em oferta para teste
        description: "LAPIS FABER COR C/12 GDE 120112+2N (2 LAPIS+1 APO+",
        image: null
      };
      
      const isOnSale = mockData.offer > 0 && mockData.offer < mockData.price;
      const formattedDescription = mockData.description.charAt(0).toUpperCase() + 
                                 mockData.description.slice(1).toLowerCase();

      const product: Product = {
        codbar: mockData.ean,
        descricao: formattedDescription,
        exibicao: {
          cor_fundo: isOnSale ? '#ff0000' : '#ffffff',
          estilo: isOnSale ? 'oferta' : 'normal',
          texto_destaque: isOnSale ? 'OFERTA' : '',
          texto_primario: isOnSale ? `DE R$ ${mockData.price.toFixed(2)}` : `R$ ${mockData.price.toFixed(2)}`,
          texto_secundario: isOnSale ? `POR R$ ${mockData.offer.toFixed(2)}` : '',
        },
        imagem_url: mockData.image || '',
        preco_principal: isOnSale ? mockData.offer : mockData.price,
        preco_secundario: isOnSale ? mockData.price : null,
        tem_promocao: isOnSale,
        texto_detalhes: formattedDescription,
        tipo_oferta: isOnSale ? 'DE' : '',
        tipo_preco: isOnSale ? 'POR' : 'NORMAL',
        valor_oferta_calculado: isOnSale ? mockData.offer : mockData.price,
      };

      return product;
    }
  }

  public static async getProductAudio(barcode: string): Promise<AudioResponse> {
    const apiUrl = ConfigManager.getApiUrl(); // Para logs apenas
    console.log('API configurada:', apiUrl);
    
    // Lista de endpoints via proxy para tentar buscar o áudio (sem CORS)
    const audioEndpoints = [
      `/api/produto/codbar/${barcode}/audio_detalhe`,
      `/api/produto/${barcode}/audio`,
      `/api/audio/${barcode}`,
    ];

    let lastError: Error | null = null;

    for (const endpoint of audioEndpoints) {
      try {
        console.log(`Tentando buscar áudio em: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Verificar se a resposta contém erro
          if (data.error) {
            throw new Error(`Erro da API: ${data.error}`);
          }
          
          // Verificar se tem os campos esperados
          if (data.audio_url) {
            console.log(`Áudio encontrado em ${endpoint}:`, data.audio_url);
            return data;
          }
        }
        
        // Se chegou aqui, o endpoint não funcionou
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(`${endpoint}: ${response.status} - ${errorData.error || response.statusText}`);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`Erro desconhecido em ${endpoint}`);
        console.info(`Endpoint ${endpoint} não disponível:`, lastError.message);
      }
    }

    // Se chegou aqui, nenhum endpoint funcionou
    throw lastError || new Error('Nenhum endpoint de áudio disponível');
  }
} 