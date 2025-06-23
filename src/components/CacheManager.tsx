import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { mediaCacheService } from '../lib/services/MediaCacheService';
import { useMediaCache, useMultipleMediaCache } from '../hooks/useMediaCache';

interface CacheStats {
  totalSize: number;
  itemCount: number;
  lastCleanup: number;
}

interface CacheManagerProps {
  onClose?: () => void;
}

const CacheManager: React.FC<CacheManagerProps> = ({ onClose }) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);

  // Hook para gerenciar cache
  const { cacheStats, clearCache, isOnline } = useMediaCache(null, 'image');

  // Atualizar estatísticas
  const updateStats = async () => {
    try {
      const newStats = await mediaCacheService.getCacheStats();
      setStats(newStats);
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
    }
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000); // A cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  // Formatar tamanho em bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Limpar cache
  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      await clearCache();
      await updateStats();
      console.log('🗑️ Cache limpo com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  // Limpeza inteligente (apenas itens expirados)
  const handleSmartCleanup = async () => {
    setIsLoading(true);
    try {
      await mediaCacheService.cleanup();
      await updateStats();
      console.log('🧹 Limpeza inteligente concluída');
    } catch (error) {
      console.error('❌ Erro na limpeza inteligente:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Pré-carregar mídias populares (exemplo)
  const handlePreloadCommonMedias = async () => {
    setIsPreloading(true);
    setPreloadProgress(0);

    try {
      // URLs de exemplo - você pode adaptar para suas necessidades
      const commonImages = [
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400',
        'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=400'
      ];

      // Simular progresso
      for (let i = 0; i < commonImages.length; i++) {
        await mediaCacheService.cacheMedia(commonImages[i], 'image');
        setPreloadProgress(((i + 1) / commonImages.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay para visualizar progresso
      }

      await updateStats();
      console.log('🚀 Pré-carregamento concluído');
    } catch (error) {
      console.error('❌ Erro no pré-carregamento:', error);
    } finally {
      setIsPreloading(false);
      setPreloadProgress(0);
    }
  };

  const maxCacheSize = 500 * 1024 * 1024; // 500MB
  const usagePercentage = stats ? (stats.totalSize / maxCacheSize) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Gerenciador de Cache</CardTitle>
              <CardDescription>
                Gerencie o cache local de mídias para melhor performance
              </CardDescription>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status de Conexão */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="font-medium">
              {isOnline ? 'Online' : 'Offline'} - {isOnline ? 'Cache ativo' : 'Usando apenas cache local'}
            </span>
          </div>

          {/* Estatísticas do Cache */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Estatísticas do Cache</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.itemCount || 0}
                </div>
                <div className="text-sm text-blue-700">Itens em cache</div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats ? formatBytes(stats.totalSize) : '0 B'}
                </div>
                <div className="text-sm text-green-700">Espaço usado</div>
              </div>
            </div>

            {/* Barra de uso do cache */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uso do cache</span>
                <span>{usagePercentage.toFixed(1)}% de {formatBytes(maxCacheSize)}</span>
              </div>
              <Progress 
                value={usagePercentage} 
                className={`h-3 ${usagePercentage > 80 ? 'bg-red-100' : usagePercentage > 60 ? 'bg-yellow-100' : 'bg-green-100'}`}
              />
              {usagePercentage > 80 && (
                <p className="text-sm text-red-600">
                  ⚠️ Cache quase cheio. Considere fazer uma limpeza.
                </p>
              )}
            </div>
          </div>

          {/* Pré-carregamento */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pré-carregamento</h3>
            
            {isPreloading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pré-carregando mídias...</span>
                  <span>{preloadProgress.toFixed(0)}%</span>
                </div>
                <Progress value={preloadProgress} className="h-2" />
              </div>
            )}
            
            <Button 
              onClick={handlePreloadCommonMedias}
              disabled={isPreloading || !isOnline}
              className="w-full"
            >
              {isPreloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                  Pré-carregando...
                </>
              ) : (
                '🚀 Pré-carregar Mídias Populares'
              )}
            </Button>
          </div>

          {/* Ações de Limpeza */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Manutenção</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={handleSmartCleanup}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin mr-2"></div>
                    Limpando...
                  </>
                ) : (
                  '🧹 Limpeza Inteligente'
                )}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleClearCache}
                disabled={isClearing}
                className="w-full"
              >
                {isClearing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                    Limpando...
                  </>
                ) : (
                  '🗑️ Limpar Tudo'
                )}
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Limpeza Inteligente:</strong> Remove apenas itens expirados e antigos</p>
              <p><strong>Limpar Tudo:</strong> Remove todo o cache (requer reconexão)</p>
            </div>
          </div>

          {/* Informações Técnicas */}
          <div className="space-y-2 p-4 bg-gray-50 rounded-lg text-sm">
            <h4 className="font-semibold">Informações Técnicas</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="font-medium">Tecnologia:</span> IndexedDB + Blob URLs
              </div>
              <div>
                <span className="font-medium">Limite:</span> {formatBytes(maxCacheSize)}
              </div>
              <div>
                <span className="font-medium">Expiração:</span> 7 dias
              </div>
              <div>
                <span className="font-medium">Compatibilidade:</span> Android WebView
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CacheManager; 