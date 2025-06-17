
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
      console.log('Iniciando autenticação...');
      
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

      console.log('Status da resposta de autenticação:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na autenticação:', errorText);
        throw new Error(`Falha na autenticação: ${response.status}`);
      }

      const data: LoginResponse = await response.json();
      console.log('Dados de resposta da autenticação:', data);
      
      const authToken = data.token || data.access_token;
      
      if (authToken) {
        console.log('Token obtido com sucesso');
        setToken(authToken);
        return authToken;
      }
      
      console.error('Token não encontrado na resposta:', data);
      throw new Error('Token não encontrado na resposta');
    } catch (err) {
      console.error('Erro completo na autenticação:', err);
      setError(`Erro na autenticação: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      return null;
    }
  };

  const getProduct = async (barcode: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('Iniciando consulta de produto para:', barcode);
      
      // Usar token existente ou fazer nova autenticação
      let currentToken = token;
      if (!currentToken) {
        console.log('Token não encontrado, autenticando...');
        currentToken = await authenticate();
        if (!currentToken) {
          console.error('Falha na autenticação');
          setError('Erro na autenticação');
          return null;
        }
      }

      console.log('Fazendo consulta de produto com token...');
      const response = await fetch(
        `https://zaffariexpress.com.br/api/v1/consultapreco/precos?loja=51&ean=${barcode}`,
        {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Status da resposta de consulta:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Token expirado, tentando nova autenticação...');
          // Token expirado, tentar nova autenticação
          setToken(null);
          const newToken = await authenticate();
          if (newToken) {
            return getProduct(barcode); // Tentar novamente com novo token
          }
        }
        
        const errorText = await response.text();
        console.error('Erro na consulta de produto:', errorText);
        throw new Error(`Produto não encontrado: ${response.status}`);
      }

      const result: ZaffariResponse = await response.json();
      console.log('Resposta da consulta de produto:', result);
      
      if (!result.success || !result.data) {
        console.error('Produto não encontrado na resposta');
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
        unit: zaffariProduct.embalagem_venda || 'UN',
        additionalInfo: `Código: ${zaffariProduct.codigo_produto}`
      };

      console.log('Produto processado:', product);
      return product;
    } catch (err) {
      console.error('Erro completo na consulta de produto:', err);
      setError(`Erro ao consultar produto: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
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
