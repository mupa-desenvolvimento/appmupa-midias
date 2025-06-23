export interface SystemConfig {
  apiHost: string;
  apiPort: number;
  deviceId: string;
  activeLayout: number;
  timeoutDuration: number;
  syncInterval: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  apiHost: '192.168.1.10',
  apiPort: 5000,
  deviceId: '',
  activeLayout: 1,
  timeoutDuration: 30000,
  syncInterval: 300000
};

const DB_NAME = 'KioskConfigDB';
const DB_VERSION = 1;
const CONFIG_STORE = 'config';
const HISTORY_STORE = 'history';

class IndexedDBConfigManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private listeners: Array<(config: SystemConfig) => void> = [];
  private configCache: SystemConfig = DEFAULT_CONFIG;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      console.log('🗄️ Inicializando IndexedDB para configurações...');
      
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ Erro ao abrir IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('✅ IndexedDB inicializado com sucesso');
        
        // Carregar configuração inicial
        this.loadConfigToCache().then(() => {
          resolve();
        }).catch(reject);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔧 Criando/atualizando estrutura do banco...');

        // Store para configurações
        if (!db.objectStoreNames.contains(CONFIG_STORE)) {
          const configStore = db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
          configStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          console.log('📋 Store de configurações criado');
        }

        // Store para histórico
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const historyStore = db.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📚 Store de histórico criado');
        }
      };
    });
  }

  private async loadConfigToCache(): Promise<void> {
    try {
      const config = await this.getConfigFromDB();
      this.configCache = config;
      console.log('💾 Configuração carregada no cache:', config);
    } catch (error) {
      console.warn('⚠️ Erro ao carregar cache, usando padrão:', error);
      this.configCache = DEFAULT_CONFIG;
    }
  }

  private async getConfigFromDB(): Promise<SystemConfig> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CONFIG_STORE], 'readonly');
      const store = transaction.objectStore(CONFIG_STORE);
      const config: any = { ...DEFAULT_CONFIG };
      let pendingRequests = 0;
      let completedRequests = 0;

      // Buscar cada chave de configuração
      Object.keys(DEFAULT_CONFIG).forEach(key => {
        pendingRequests++;
        const request = store.get(key);

        request.onsuccess = () => {
          if (request.result) {
            config[key] = request.result.value;
          }
          completedRequests++;

          // Quando todas as requisições terminarem
          if (completedRequests === pendingRequests) {
            resolve(config as SystemConfig);
          }
        };

        request.onerror = () => {
          completedRequests++;
          if (completedRequests === pendingRequests) {
            resolve(config as SystemConfig);
          }
        };
      });

      // Se não há chaves para buscar
      if (pendingRequests === 0) {
        resolve(config as SystemConfig);
      }

      transaction.onerror = () => {
        console.error('❌ Erro na transação de leitura:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  async getConfig(): Promise<SystemConfig> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const config = await this.getConfigFromDB();
      this.configCache = config;
      console.log('📖 Configuração carregada:', config);
      return config;
    } catch (error) {
      console.error('❌ Erro ao carregar configuração:', error);
      return this.configCache;
    }
  }

  async saveConfig(config: Partial<SystemConfig>, reason: string = 'Atualização de configuração'): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Salvar no histórico primeiro
        await this.saveToHistory(this.configCache, reason);

        const transaction = this.db!.transaction([CONFIG_STORE], 'readwrite');
        const store = transaction.objectStore(CONFIG_STORE);
        const timestamp = new Date().toISOString();
        
        let pendingWrites = 0;
        let completedWrites = 0;

        // Salvar cada chave-valor
        Object.entries(config).forEach(([key, value]) => {
          pendingWrites++;
          
          const request = store.put({
            key,
            value,
            updatedAt: timestamp
          });

          request.onsuccess = () => {
            completedWrites++;
            if (completedWrites === pendingWrites) {
              // Atualizar cache
              this.configCache = { ...this.configCache, ...config };
              console.log('💾 Configuração salva:', config);
              
              // Notificar listeners
              this.notifyListeners(this.configCache);
              resolve();
            }
          };

          request.onerror = () => {
            console.error('❌ Erro ao salvar chave:', key, request.error);
            reject(request.error);
          };
        });

        if (pendingWrites === 0) {
          resolve();
        }

        transaction.onerror = () => {
          console.error('❌ Erro na transação de escrita:', transaction.error);
          reject(transaction.error);
        };

      } catch (error) {
        console.error('❌ Erro ao salvar configuração:', error);
        reject(error);
      }
    });
  }

  private async saveToHistory(config: SystemConfig, reason: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(HISTORY_STORE);

      const historyEntry = {
        config: JSON.stringify(config),
        reason,
        timestamp: new Date().toISOString()
      };

      const request = store.add(historyEntry);

      request.onsuccess = () => {
        console.log('📚 Entrada de histórico salva');
        resolve();
      };

      request.onerror = () => {
        console.warn('⚠️ Erro ao salvar histórico:', request.error);
        resolve(); // Não falhar por causa do histórico
      };
    });
  }

  async getHistory(limit: number = 10): Promise<Array<{id: number, config: SystemConfig, reason: string, timestamp: string}>> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([HISTORY_STORE], 'readonly');
      const store = transaction.objectStore(HISTORY_STORE);
      const index = store.index('timestamp');
      
      const request = index.openCursor(null, 'prev'); // Ordem decrescente
      const results: any[] = [];
      let count = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        
        if (cursor && count < limit) {
          const entry = cursor.value;
          results.push({
            id: entry.id,
            config: JSON.parse(entry.config),
            reason: entry.reason,
            timestamp: entry.timestamp
          });
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        console.error('❌ Erro ao carregar histórico:', request.error);
        reject(request.error);
      };
    });
  }

  async resetToDefault(reason: string = 'Reset para configuração padrão'): Promise<void> {
    await this.saveConfig(DEFAULT_CONFIG, reason);
    console.log('🔄 Configuração resetada para padrão');
  }

  // Método síncrono que usa cache
  getApiUrl(): string {
    const url = `http://${this.configCache.apiHost}:${this.configCache.apiPort}`;
    console.log('🔗 URL da API (cache):', url);
    return url;
  }

  // Sistema de observadores
  addListener(listener: (config: SystemConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Retorna função para remover listener
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(config: SystemConfig): void {
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (e) {
        console.error('❌ Erro ao notificar listener:', e);
      }
    });
  }

  async exportConfig(): Promise<string> {
    const config = await this.getConfig();
    const history = await this.getHistory(5);
    
    return JSON.stringify({
      current_config: config,
      history: history,
      exported_at: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  async importConfig(configData: string, reason: string = 'Importação de configuração'): Promise<boolean> {
    try {
      const data = JSON.parse(configData);
      
      if (data.current_config) {
        await this.saveConfig(data.current_config, reason);
        console.log('✅ Configuração importada com sucesso');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erro ao importar configuração:', error);
      return false;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CONFIG_STORE, HISTORY_STORE], 'readwrite');
      
      const configStore = transaction.objectStore(CONFIG_STORE);
      const historyStore = transaction.objectStore(HISTORY_STORE);
      
      const clearConfig = configStore.clear();
      const clearHistory = historyStore.clear();
      
      let completed = 0;
      const total = 2;
      
      const checkComplete = () => {
        completed++;
        if (completed === total) {
          this.configCache = DEFAULT_CONFIG;
          console.log('🗑️ Todos os dados limpos');
          resolve();
        }
      };
      
      clearConfig.onsuccess = checkComplete;
      clearHistory.onsuccess = checkComplete;
      
      clearConfig.onerror = () => reject(clearConfig.error);
      clearHistory.onerror = () => reject(clearHistory.error);
    });
  }

  async debugInfo(): Promise<void> {
    console.group('🔍 Debug IndexedDB Config Manager');
    
    try {
      const config = await this.getConfig();
      const history = await this.getHistory(3);
      
      console.log('📊 Status:', {
        initialized: this.isInitialized,
        listeners: this.listeners.length,
        dbName: DB_NAME,
        version: DB_VERSION
      });
      
      console.log('⚙️ Configuração Atual:', config);
      console.log('💾 Cache:', this.configCache);
      console.log('📚 Histórico (últimas 3):', history);
      console.log('🔗 URL da API:', this.getApiUrl());
      
    } catch (error) {
      console.error('❌ Erro no debug:', error);
    }
    
    console.groupEnd();
  }
}

// Instância singleton
export const configDB = new IndexedDBConfigManager();

// Interface compatível com o sistema antigo
export const ConfigManager = {
  async getConfig(): Promise<SystemConfig> {
    return await configDB.getConfig();
  },

  async saveConfig(config: Partial<SystemConfig>): Promise<void> {
    await configDB.saveConfig(config, 'Atualização via ConfigManager');
  },

  getApiUrl(): string {
    return configDB.getApiUrl();
  },

  async resetToDefault(): Promise<void> {
    await configDB.resetToDefault();
  },

  addConfigListener(listener: (config: SystemConfig) => void): () => void {
    return configDB.addListener(listener);
  },

  async debugConfig(): Promise<void> {
    await configDB.debugInfo();
  },

  async exportConfig(): Promise<string> {
    return await configDB.exportConfig();
  },

  async importConfig(configString: string): Promise<boolean> {
    return await configDB.importConfig(configString);
  },

  async clearAllData(): Promise<void> {
    await configDB.clearAllData();
  }
}; 