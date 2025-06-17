
import { useState } from 'react';
import { Product } from '../types';

interface ZaffariProduct {
  codigo_etiqueta: string;
  codigo_produto: string;
  descricao_produto: string;
  ean: string;
  embalagem_proporcional: string;
  embalagem_venda: string;
  link_imagem: string;
  loja: string;
  media_venda: string;
  preco_base: string;
  preco_prop_sellprice: string;
  status_venda: string;
}

interface ZaffariResponse {
  success: boolean;
  data: ZaffariProduct;
}

interface LoginResponse {
  token?: string;
  access_token?: string;
}

export const useProductData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const authenticate = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://zaffariexpress.com.br/api/login/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: 'mupa',
          password: '7hDD$%k*WJrY%4sQQY9G'
        })
      });

      if (!response.ok) {
        throw new Error('Falha na autenticação');
      }

      const data: LoginResponse = await response.json();
      const authToken = data.token || data.access_token;
      
      if (authToken) {
        setToken(authToken);
        return authToken;
      }
      
      throw new Error('Token não encontrado na resposta');
    } catch (err) {
      console.error('Erro na autenticação:', err);
      return null;
    }
  };

  const getProduct = async (barcode: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      // Usar token existente ou fazer nova autenticação
      let currentToken = token;
      if (!currentToken) {
        currentToken = await authenticate();
        if (!currentToken) {
          setError('Erro na autenticação');
          return null;
        }
      }

      const response = await fetch(
        `https://zaffariexpress.com.br/api/v1/consultapreco/precos?loja=51&ean=${barcode}`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado, tentar nova autenticação
          const newToken = await authenticate();
          if (newToken) {
            return getProduct(barcode); // Tentar novamente com novo token
          }
        }
        throw new Error('Produto não encontrado');
      }

      const result: ZaffariResponse = await response.json();
      
      if (!result.success || !result.data) {
        setError('Produto não encontrado');
        return null;
      }

      const zaffariProduct = result.data;
      
      // Converter para o formato interno
      const product: Product = {
        id: zaffariProduct.codigo_produto,
        barcode: zaffariProduct.ean,
        name: zaffariProduct.descricao_produto,
        description: zaffariProduct.descricao_produto,
        imageUrl: zaffariProduct.link_imagem || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
        normalPrice: parseFloat(zaffariProduct.preco_base),
        isOnSale: false,
        unit: zaffariProduct.embalagem_venda || 'un',
        additionalInfo: `Código: ${zaffariProduct.codigo_produto}`
      };

      return product;
    } catch (err) {
      console.error('Erro ao consultar produto:', err);
      setError('Erro ao consultar produto');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getProduct
  };
};
