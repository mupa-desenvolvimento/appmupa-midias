import { useState, useEffect, useCallback } from 'react';
import { mediaCacheService } from '../lib/services/MediaCacheService';

interface UseMediaCacheReturn {
  cachedUrl: string | null;
  isLoading: boolean;
  error: string | null;
  cacheStats: {
    totalSize: number;
    itemCount: number;
    lastCleanup: number;
  } | null;
  preloadMedias: (urls: string[], type: 'image' | 'video' | 'audio') => Promise<void>;
  clearCache: () => Promise<void>;
  isOnline: boolean;
}

export const useMediaCache = (
  url: string | null, 
  type: 'image' | 'video' | 'audio'
): UseMediaCacheReturn => {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<UseMediaCacheReturn['cacheStats']>(null);
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

  useEffect(() => {
    let objectUrl: string | null = null;

    const getMedia = async () => {
      if (!url) {
        setCachedUrl(null);
        setIsLoading(false);
        return;
      }

    setIsLoading(true);
    setError(null);

    try {
        const blob = await mediaCacheService.getMediaBlob(url);
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setCachedUrl(objectUrl);
        } else {
          // Se não estiver em cache, tentar buscar online e cachear
          console.log(`📡 Mídia não encontrada no cache. Buscando online: ${url}`);
          const newObjectUrl = await mediaCacheService.cacheMedia(url, type);
          // Se cache falhar, cacheMedia retorna a URL original
          if (newObjectUrl.startsWith('blob:')) {
            objectUrl = newObjectUrl;
          }
          setCachedUrl(newObjectUrl);
        }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error(`❌ Hook: Erro ao obter mídia ${url}:`, errorMessage);
      setError(errorMessage);
        setCachedUrl(url); // Fallback para a URL original em caso de erro
    } finally {
      setIsLoading(false);
    }
    };

    getMedia();

    // Função de limpeza para revogar o Object URL e evitar vazamentos de memória
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, type]);

  // Obter estatísticas do cache
  const updateCacheStats = useCallback(async () => {
    try {
      const stats = await mediaCacheService.getCacheStats();
      setCacheStats(stats);
    } catch (err) {
      console.error('❌ Hook: Erro ao obter estatísticas do cache:', err);
    }
  }, []);

  // Atualizar estatísticas periodicamente
  useEffect(() => {
    updateCacheStats();
    const interval = setInterval(updateCacheStats, 30000); // A cada 30 segundos
    return () => clearInterval(interval);
  }, [updateCacheStats]);

  // Pré-carregar múltiplas mídias
  const preloadMedias = useCallback(async (urls: string[], mediaType: 'image' | 'video' | 'audio') => {
    try {
      await mediaCacheService.preloadMedias(urls, mediaType);
      await updateCacheStats();
    } catch (err) {
      console.error('❌ Hook: Erro no pré-carregamento:', err);
    }
  }, [updateCacheStats]);

  // Limpar cache
  const clearCache = useCallback(async () => {
    try {
      await mediaCacheService.clearAll();
      await updateCacheStats();
      console.log('🗑️ Hook: Cache limpo com sucesso');
    } catch (err) {
      console.error('❌ Hook: Erro ao limpar cache:', err);
    }
  }, [updateCacheStats]);

  return {
    cachedUrl,
    isLoading,
    error,
    cacheStats,
    preloadMedias,
    clearCache,
    isOnline
  };
};

// Hook especializado para múltiplas mídias
export const useMultipleMediaCache = (
  mediaList: Array<{ url: string; type: 'image' | 'video' | 'audio' }>
) => {
  const [cachedMedias, setCachedMedias] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const cacheMultipleMedias = useCallback(async () => {
    if (mediaList.length === 0) return;

    setIsLoading(true);
    setProgress(0);
    
    const newCachedMedias = new Map<string, string>();
    
    for (let i = 0; i < mediaList.length; i++) {
      const media = mediaList[i];
      try {
        const cachedUrl = await mediaCacheService.getOptimizedUrl(media.url, media.type);
        newCachedMedias.set(media.url, cachedUrl);
        setProgress(((i + 1) / mediaList.length) * 100);
      } catch (error) {
        console.error(`❌ Erro ao cachear mídia ${media.url}:`, error);
        newCachedMedias.set(media.url, media.url); // Fallback
      }
    }

    setCachedMedias(newCachedMedias);
    setIsLoading(false);
  }, [mediaList]);

  useEffect(() => {
    cacheMultipleMedias();
  }, [cacheMultipleMedias]);

  return {
    cachedMedias,
    isLoading,
    progress,
    getCachedUrl: (originalUrl: string) => cachedMedias.get(originalUrl) || originalUrl
  };
};

export default useMediaCache; 