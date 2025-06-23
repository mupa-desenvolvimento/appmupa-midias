import { useState } from 'react';
import { Product } from '../types';
import { ProductService } from '../lib/api/products';

interface AudioResponse {
  audio_hash: string;
  audio_url: string;
  texto: string;
}

export const useProductData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Consulta de produto
  const getProduct = async (barcode: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Iniciando consulta do produto:', barcode);
      
      // Usar o novo ProductService que já usa o endpoint fixo
      const productData = await ProductService.getProductByBarcode(barcode);
      console.log('Produto obtido do novo endpoint:', productData);

      // Buscar áudio do produto via proxy (sem CORS)
      const audioResponse = await fetch(
        `/api/produto/codbar/${barcode}/audio_detalhe`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      let audioUrl = '';
      if (audioResponse.ok) {
        const audioResult: AudioResponse = await audioResponse.json();
        audioUrl = audioResult.audio_url;
      }

      // Função para obter token da Mupa
      const getMupaToken = async (): Promise<string | null> => {
        const TOKEN_KEY = 'mupa_token';
        const TOKEN_EXP_KEY = 'mupa_token_exp';
        const now = Date.now();
        const cachedToken = localStorage.getItem(TOKEN_KEY);
        const cachedExp = localStorage.getItem(TOKEN_EXP_KEY);
        if (cachedToken && cachedExp && now < parseInt(cachedExp, 10)) {
          return cachedToken;
        }
        // Buscar novo token
        const loginResp = await fetch('http://srv-mupa.ddns.net:5050/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            username: 'antunes@mupa.app',
            password: '#Mupa04051623$'
          })
        });
        if (!loginResp.ok) return null;
        const loginData = await loginResp.json();
        if (loginData && loginData.access_token) {
          try {
            localStorage.setItem(TOKEN_KEY, loginData.access_token);
            localStorage.setItem(TOKEN_EXP_KEY, (now + 3500 * 1000).toString());
          } catch {}
          return loginData.access_token;
        }
        return null;
      };

      // Buscar imagem do produto na API Mupa via proxy
      let mupaImageUrl = '';
      let productCores = undefined;
      try {
        const mupaToken = await getMupaToken();
        if (mupaToken) {
          const mupaResponse = await fetch(
            `/produto-imagem/${barcode}`,
            {
              headers: {
                'Authorization': `Bearer ${mupaToken}`
              }
            }
          );
          if (mupaResponse.ok) {
            const mupaData = await mupaResponse.json();
            if (mupaData && mupaData.imagem_url) {
              mupaImageUrl = mupaData.imagem_url;
            }
            if (mupaData && mupaData.cores) {
              productCores = mupaData.cores;
            }
          }
        }
      } catch (e) {
        // Se der erro, ignora e usa o fallback
      }

      // Converter para o formato Product esperado pelo sistema
      const product: Product = {
        id: productData.codbar,
        barcode: productData.codbar,
        name: productData.descricao,
        description: productData.descricao,
        imageUrl: mupaImageUrl || productData.imagem_url,
        // Para tipo "preco_de_por": preco_principal é o POR (promocional), preco_secundario é o DE (original)
        normalPrice: productData.tipo_preco === 'POR' ? productData.preco_secundario : productData.preco_principal,
        isOnSale: productData.tem_promocao,
        salePrice: productData.tipo_preco === 'POR' ? productData.preco_principal : productData.preco_secundario,
        unit: 'UN',
        additionalInfo: productData.texto_detalhes,
        audioUrl: audioUrl,
        displayInfo: {
          backgroundColor: productData.exibicao.cor_fundo,
          style: productData.exibicao.estilo,
          highlightText: productData.exibicao.texto_destaque,
          primaryText: productData.exibicao.texto_primario,
          secondaryText: productData.exibicao.texto_secundario,
          tipo_preco: productData.tipo_preco,
          tipo_oferta: productData.tipo_oferta,
          dominante: productCores?.dominante,
          secundaria: productCores?.secundaria,
          terciaria: productCores?.terciaria,
          quaternaria: productCores?.quaternaria
        }
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
