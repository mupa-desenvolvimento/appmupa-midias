import { useState } from 'react';
import { Product } from '../types';

const TOKEN_KEY = 'zaffari_token';
const TOKEN_TIMESTAMP_KEY = 'zaffari_token_timestamp';
const TOKEN_EXPIRY_SECONDS = 3600;

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

export const useProductData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para obter token do localStorage
  const getStoredToken = (): string | null => {
    const token = localStorage.getItem(TOKEN_KEY);
    const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
    if (token && timestamp) {
      const now = Math.floor(Date.now() / 1000);
      const lastUpdate = parseInt(timestamp, 10);
      if (now - lastUpdate < TOKEN_EXPIRY_SECONDS) {
        return token;
      }
    }
    return null;
  };

  // Função para salvar token e timestamp
  const saveToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Math.floor(Date.now() / 1000).toString());
  };

  // Autenticação
  const authenticate = async (): Promise<string | null> => {
    try {
      setError(null);
      const response = await fetch('/api/login/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: 'mupa',
          password: '7hDD$%k*WJrY%4sQQY9G',
        }),
      });
      if (!response.ok) {
        setError('Falha na autenticação');
        return null;
      }
      const data = await response.json();
      const token = data.token || data.access_token;
      if (token) {
        saveToken(token);
        return token;
      }
      setError('Token não encontrado na resposta');
      return null;
    } catch (err) {
      setError('Erro na autenticação');
      return null;
    }
  };

  // Consulta de produto
  const getProduct = async (barcode: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);
    try {
      let token = getStoredToken();
      if (!token) {
        token = await authenticate();
        if (!token) {
          setError('Erro na autenticação');
          setLoading(false);
          return null;
        }
      }
      const response = await fetch(
        `/api/v1/consultapreco/precos?loja=51&ean=${barcode}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado, tentar autenticar novamente
          token = await authenticate();
          if (token) {
            return await getProduct(barcode);
          }
        }
        setError('Produto não encontrado');
        setLoading(false);
        return null;
      }
      const result: ZaffariResponse = await response.json();
      if (!result.success || !result.data) {
        setError('Produto não encontrado');
        setLoading(false);
        return null;
      }
      const zaffariProduct = result.data;
      const product: Product = {
        id: zaffariProduct.codigo_produto,
        barcode: zaffariProduct.ean,
        name: zaffariProduct.descricao_produto,
        description: zaffariProduct.descricao_produto,
        imageUrl: zaffariProduct.link_imagem || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
        normalPrice: parseFloat(zaffariProduct.preco_base),
        isOnSale: false,
        unit: zaffariProduct.embalagem_venda || 'UN',
        additionalInfo: `Código: ${zaffariProduct.codigo_produto}`,
      };
      setLoading(false);
      return product;
    } catch (err) {
      setError('Erro ao consultar produto');
      setLoading(false);
      return null;
    }
  };

  return {
    loading,
    error,
    getProduct,
  };
};
