interface CachedMedia {
  url: string;
  blob: Blob;
  type: 'image' | 'video' | 'audio';
  size: number;
  lastAccessed: number;
  expiresAt: number;
}

interface CacheStats {
  totalSize: number;
  itemCount: number;
  lastCleanup: number;
}

class MediaCacheService {
  private dbName = 'MediaCache';
  private dbVersion = 1;
  private storeName = 'media';
  private maxCacheSize = 500 * 1024 * 1024; // 500MB
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Erro ao abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB inicializado para cache de mídia');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          console.log('📦 Object store criado para cache de mídia');
        }
      };
    });
  }

  async cacheMedia(url: string, type: 'image' | 'video' | 'audio'): Promise<string> {
    try {
      console.log(`📥 Iniciando cache de ${type}:`, url);

      // Verificar se já está em cache
      const cachedBlob = await this.getMediaBlob(url);
      if (cachedBlob) {
        const localUrl = URL.createObjectURL(cachedBlob);
        console.log(`✅ ${type} já em cache, usando blob existente:`, localUrl);
        await this.updateLastAccessed(url);
        return localUrl;
      }

      // Baixar mídia
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Erro ao baixar ${type}: ${response.status}`);
      }

      const blob = await response.blob();

      // Salvar no cache
      const cachedMedia: CachedMedia = {
        url,
        blob,
        type,
        size: blob.size,
        lastAccessed: Date.now(),
        expiresAt: Date.now() + this.maxAge
      };

      await this.saveCachedMedia(cachedMedia);
      
      // Criar URL para uso imediato
      const localUrl = URL.createObjectURL(blob);
      console.log(`✅ ${type} cacheado com sucesso:`, localUrl);

      // Verificar e limpar cache se necessário
      await this.cleanupIfNeeded();

      return localUrl;

    } catch (error) {
      console.error(`❌ Erro ao cachear ${type}:`, error);
      return url; // Retorna URL original em caso de erro
    }
  }

  async getMediaBlob(url: string): Promise<Blob | null> {
    const cachedMedia = await this.getCachedMedia(url);
    return cachedMedia ? cachedMedia.blob : null;
  }

  private async getCachedMedia(url: string): Promise<CachedMedia | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as CachedMedia | undefined;
        
        if (result && result.expiresAt > Date.now()) {
          resolve(result);
        } else if (result) {
          // Expirado, remover
          this.removeCachedMedia(url);
          resolve(null);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('❌ Erro ao buscar mídia em cache:', request.error);
        reject(request.error);
      };
    });
  }

  private async saveCachedMedia(cachedMedia: CachedMedia): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(cachedMedia);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('❌ Erro ao salvar mídia em cache:', request.error);
        reject(request.error);
      };
    });
  }

  private async updateLastAccessed(url: string): Promise<void> {
    if (!this.db) await this.initDB();

    const cachedMedia = await this.getCachedMedia(url);
    if (cachedMedia) {
      cachedMedia.lastAccessed = Date.now();
      await this.saveCachedMedia(cachedMedia);
    }
  }

  private async removeCachedMedia(url: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(url);

      request.onsuccess = () => {
        console.log('🗑️ Mídia removida do cache:', url);
        resolve();
      };
      request.onerror = () => {
        console.error('❌ Erro ao remover mídia do cache:', request.error);
        reject(request.error);
      };
    });
  }

  async getCacheStats(): Promise<CacheStats> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as CachedMedia[];
        const totalSize = items.reduce((sum, item) => sum + item.size, 0);
        
        resolve({
          totalSize,
          itemCount: items.length,
          lastCleanup: Date.now()
        });
      };

      request.onerror = () => {
        console.error('❌ Erro ao obter estatísticas do cache:', request.error);
        reject(request.error);
      };
    });
  }

  private async cleanupIfNeeded(): Promise<void> {
    const stats = await this.getCacheStats();
    
    if (stats.totalSize > this.maxCacheSize) {
      console.log('🧹 Cache excedeu limite, iniciando limpeza...');
      await this.cleanup();
    }
  }

  async cleanup(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('lastAccessed');
      const request = index.openCursor();

      const itemsToDelete: string[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const cachedMedia = cursor.value as CachedMedia;
          
          // Remover itens expirados ou mais antigos
          if (cachedMedia.expiresAt < Date.now() || 
              (Date.now() - cachedMedia.lastAccessed) > this.maxAge) {
            itemsToDelete.push(cachedMedia.url);
          }
          
          cursor.continue();
        } else {
          // Remover itens identificados
          Promise.all(itemsToDelete.map(url => this.removeCachedMedia(url)))
            .then(() => {
              console.log(`🧹 Limpeza concluída: ${itemsToDelete.length} itens removidos`);
              resolve();
            })
            .catch(reject);
        }
      };

      request.onerror = () => {
        console.error('❌ Erro durante limpeza do cache:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🗑️ Todo o cache foi limpo');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Erro ao limpar cache:', request.error);
        reject(request.error);
      };
    });
  }

  // Pré-carregar mídias em background
  async preloadMedias(urls: string[], type: 'image' | 'video' | 'audio'): Promise<void> {
    console.log(`🚀 Pré-carregando ${urls.length} ${type}s...`);
    
    const promises = urls.map(async (url, index) => {
      // Delay escalonado para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, index * 100));
      return this.cacheMedia(url, type);
    });

    try {
      await Promise.allSettled(promises);
      console.log(`✅ Pré-carregamento de ${type}s concluído`);
    } catch (error) {
      console.error(`❌ Erro no pré-carregamento de ${type}s:`, error);
    }
  }

  // Para Android WebView - verificar se está online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Obter URL com fallback para cache
  async getOptimizedUrl(url: string, type: 'image' | 'video' | 'audio'): Promise<string> {
    if (!this.isOnline()) {
      // Offline: tentar cache primeiro
      const cached = await this.getCachedMedia(url);
      return cached ? cached.localUrl : url;
    }

    // Online: cachear e retornar
    return this.cacheMedia(url, type);
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('✅ Cache limpo com sucesso');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Erro ao limpar cache:', request.error);
        reject(request.error);
      };
    });
  }
}

export const mediaCacheService = new MediaCacheService();
export default MediaCacheService; 