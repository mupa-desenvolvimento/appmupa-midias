
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
        console.log('Token válido encontrado no localStorage');
        return token;
      } else {
        console.log('Token expirado, removendo do localStorage');
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
      }
    }
    return null;
  };

  // Função para salvar token e timestamp
  const saveToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_TIMESTAMP_KEY, Math.floor(Date.now() / 1000).toString());
    console.log('Token salvo no localStorage');
  };

  // Autenticação
  const authenticate = async (): Promise<string | null> => {
    try {
      console.log('Iniciando autenticação...');
      setError(null);
      
      const response = await fetch('https://zaffariexpress.com.br/api/login/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario: 'mupa',
          password: '7hDD$%k*WJrY%4sQQY9G',
        }),
      });

      console.log('Status da autenticação:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta da autenticação:', errorText);
        setError(`Falha na autenticação: ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log('Resposta da autenticação:', data);
      
      const token = data.token || data.access_token;
      if (token) {
        saveToken(token);
        console.log('Token obtido com sucesso');
        return token;
      } else {
        console.error('Token não encontrado na resposta:', data);
        setError('Token não encontrado na resposta');
        return null;
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setError('Erro de conexão na autenticação');
      return null;
    }
  };

  // Consulta de produto
  const getProduct = async (barcode: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Iniciando consulta do produto:', barcode);
      
      let token = getStoredToken();
      if (!token) {
        console.log('Token não encontrado, fazendo autenticação...');
        token = await authenticate();
        if (!token) {
          setError('Erro na autenticação');
          setLoading(false);
          return null;
        }
      }

      console.log('Fazendo consulta com token:', token.substring(0, 20) + '...');
      
      const response = await fetch(
        `https://zaffariexpress.com.br/api/v1/consultapreco/precos?loja=51&ean=${barcode}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Status da consulta:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Token expirado, tentando reautenticar...');
          // Token expirado, tentar autenticar novamente
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
          token = await authenticate();
          if (token) {
            console.log('Tentando consulta novamente com novo token...');
            return await getProduct(barcode);
          }
        }
        const errorText = await response.text();
        console.error('Erro na consulta:', errorText);
        setError(`Produto não encontrado: ${response.status}`);
        setLoading(false);
        return null;
      }

      const result: ZaffariResponse = await response.json();
      console.log('Resposta da consulta:', result);
      
      if (!result.success || !result.data) {
        console.error('Produto não encontrado na resposta');
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

      console.log('Produto processado:', product);
      setLoading(false);
      return product;
    } catch (err) {
      console.error('Erro geral na consulta:', err);
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
