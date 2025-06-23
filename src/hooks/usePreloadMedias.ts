import { useEffect, useState } from 'react';
import { mediaCacheService } from '../lib/services/MediaCacheService';
import { ProductService, Product as ApiProduct } from '../lib/api/products';

interface UsePreloadMediasOptions {
  enabled?: boolean;
  maxItems?: number;
  preloadOnIdle?: boolean;
}

interface PreloadStats {
  totalItems: number;
  loadedItems: number;
  failedItems: number;
  isLoading: boolean;
  progress: number;
}

export const usePreloadMedias = (options: UsePreloadMediasOptions = {}) => {
  const { 
    enabled = true, 
    maxItems = 20, 
    preloadOnIdle = true 
  } = options;

  const [stats, setStats] = useState<PreloadStats>({
    totalItems: 0,
    loadedItems: 0,
    failedItems: 0,
    isLoading: false,
    progress: 0
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitorar status de conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Função para pré-carregar mídias populares
  const preloadPopularMedias = async () => {
    if (!enabled || !isOnline) {
      console.log('🚫 Pré-carregamento desabilitado ou offline');
      return;
    }

    setStats(prev => ({ ...prev, isLoading: true, progress: 0 }));

    try {
      console.log('🚀 Iniciando pré-carregamento de mídias populares...');

      // Buscar produtos populares (simulação - adapte para sua API)
      const popularProducts = await getPopularProducts(maxItems);
      
      setStats(prev => ({ 
        ...prev, 
        totalItems: popularProducts.length,
        loadedItems: 0,
        failedItems: 0
      }));

      let loaded = 0;
      let failed = 0;

      // Pré-carregar imagens dos produtos
      for (let i = 0; i < popularProducts.length; i++) {
        const product = popularProducts[i];
        
        try {
          // Pré-carregar imagem do produto
          if (product.imageUrl) {
            await mediaCacheService.cacheMedia(product.imageUrl, 'image');
            console.log(`✅ Imagem cacheada: ${product.name}`);
          }

          // Pré-carregar áudio se disponível
          if (product.audioUrl) {
            await mediaCacheService.cacheMedia(product.audioUrl, 'audio');
            console.log(`🎵 Áudio cacheado: ${product.name}`);
          }

          loaded++;
        } catch (error) {
          console.error(`❌ Erro ao cachear mídia do produto ${product.name}:`, error);
          failed++;
        }

        // Atualizar progresso
        const progress = ((i + 1) / popularProducts.length) * 100;
        setStats(prev => ({
          ...prev,
          loadedItems: loaded,
          failedItems: failed,
          progress
        }));

        // Delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`✅ Pré-carregamento concluído: ${loaded} sucessos, ${failed} falhas`);

    } catch (error) {
      console.error('❌ Erro no pré-carregamento:', error);
    } finally {
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Função para obter produtos populares (adapte para sua API)
  const getPopularProducts = async (limit: number) => {
    try {
      // Exemplo de implementação - adapte para sua API
      const response = await fetch(`/api/produtos/populares?limit=${limit}`);
      
      if (!response.ok) {
        // Fallback: usar produtos fictícios para demonstração
        return generateMockProducts(limit);
      }

      const data = await response.json();
      return data.products || [];
    } catch (error) {
      console.warn('⚠️ Erro ao buscar produtos populares, usando mock:', error);
      return generateMockProducts(limit);
    }
  };

  // Gerar produtos fictícios para demonstração
  const generateMockProducts = (count: number) => {
    const mockProducts = [];
    
    for (let i = 1; i <= count; i++) {
      mockProducts.push({
        id: `mock-${i}`,
        name: `Produto Popular ${i}`,
        barcode: `789000000${i.toString().padStart(3, '0')}`,
        imageUrl: `https://picsum.photos/400/400?random=${i}`,
        audioUrl: null, // Normalmente viria da API
        price: 10.99 + (i * 2.5)
      });
    }

    return mockProducts;
  };

  // Pré-carregar quando o usuário estiver idle
  useEffect(() => {
    if (!preloadOnIdle || !enabled) return;

    let idleTimer: NodeJS.Timeout;
    let isIdle = false;

    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      isIdle = false;
      
      idleTimer = setTimeout(() => {
        isIdle = true;
        if (isOnline && !stats.isLoading) {
          console.log('😴 Usuário idle, iniciando pré-carregamento...');
          preloadPopularMedias();
        }
      }, 30000); // 30 segundos de inatividade
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    resetIdleTimer(); // Iniciar timer

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer, true);
      });
    };
  }, [enabled, preloadOnIdle, isOnline, stats.isLoading]);

  // Pré-carregar específicos produtos
  const preloadSpecificProducts = async (productIds: string[]) => {
    if (!enabled || !isOnline) return;

    setStats(prev => ({ ...prev, isLoading: true }));

    try {
      console.log(`🎯 Pré-carregando ${productIds.length} produtos específicos...`);

      for (const productId of productIds) {
                 try {
           // Buscar dados do produto
           const product = await ProductService.getProductByBarcode(productId);
           
           if (product.imagem_url) {
             await mediaCacheService.cacheMedia(product.imagem_url, 'image');
           }
           
           // Tentar buscar áudio separadamente
           try {
             const audioData = await ProductService.getProductAudio(productId);
             if (audioData.audio_url) {
               await mediaCacheService.cacheMedia(audioData.audio_url, 'audio');
             }
           } catch (audioError) {
             console.info(`Áudio não disponível para produto ${productId}`);
           }

           console.log(`✅ Produto cacheado: ${product.descricao}`);
         } catch (error) {
          console.error(`❌ Erro ao cachear produto ${productId}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Erro no pré-carregamento específico:', error);
    } finally {
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  return {
    stats,
    isOnline,
    preloadPopularMedias,
    preloadSpecificProducts,
    isPreloading: stats.isLoading
  };
};

export default usePreloadMedias; 