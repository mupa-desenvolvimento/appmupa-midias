import initSqlJs from 'sql.js';

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

class ConfigDatabase {
  private db: any = null;
  private isInitialized = false;
  private listeners: Array<(config: SystemConfig) => void> = [];

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🗄️ Inicializando banco SQLite para configurações...');
      
      // Inicializar SQL.js
      const SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // Tentar carregar banco existente do localStorage
      const savedDb = localStorage.getItem('kiosk_config_db');
      
      if (savedDb) {
        // Carregar banco existente
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        this.db = new SQL.Database(uint8Array);
        console.log('✅ Banco SQLite carregado do localStorage');
      } else {
        // Criar novo banco
        this.db = new SQL.Database();
        console.log('✅ Novo banco SQLite criado');
      }

      // Criar tabela se não existir
      this.createTables();
      
      // Inserir configuração padrão se não existir nenhuma
      await this.ensureDefaultConfig();
      
      this.isInitialized = true;
      console.log('🎯 Banco SQLite inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar banco SQLite:', error);
      throw error;
    }
  }

  private createTables(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS config_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_snapshot TEXT NOT NULL,
        change_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    this.db.exec(createTableSQL);
    console.log('📋 Tabelas do banco criadas/verificadas');
  }

  private async ensureDefaultConfig(): Promise<void> {
    const existingConfig = await this.getConfig();
    
    // Se não há configuração, inserir padrão
    if (!existingConfig.apiHost) {
      await this.saveConfig(DEFAULT_CONFIG, 'Configuração inicial padrão');
      console.log('🔧 Configuração padrão inserida no banco');
    }
  }

  async getConfig(): Promise<SystemConfig> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const stmt = this.db.prepare('SELECT key, value FROM config');
      const rows = [];
      
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();

      // Converter resultados para objeto de configuração
      const config: any = { ...DEFAULT_CONFIG };
      
      rows.forEach((row: any) => {
        try {
          config[row.key] = JSON.parse(row.value);
        } catch (e) {
          config[row.key] = row.value;
        }
      });

      console.log('📖 Configuração carregada do SQLite:', config);
      return config as SystemConfig;
      
    } catch (error) {
      console.error('❌ Erro ao carregar configuração do SQLite:', error);
      return DEFAULT_CONFIG;
    }
  }

  async saveConfig(config: Partial<SystemConfig>, reason?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Salvar histórico antes da mudança
      if (reason) {
        const currentConfig = await this.getConfig();
        await this.saveConfigHistory(currentConfig, reason);
      }

      // Começar transação
      this.db.exec('BEGIN TRANSACTION');

      // Salvar cada chave-valor
      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO config (key, value, updated_at) 
        VALUES (?, ?, datetime('now'))
      `);

      Object.entries(config).forEach(([key, value]) => {
        insertStmt.run([key, JSON.stringify(value)]);
      });

      insertStmt.free();
      
      // Commit da transação
      this.db.exec('COMMIT');

      // Salvar banco no localStorage
      await this.persistDatabase();

      console.log('💾 Configuração salva no SQLite:', config);

      // Notificar listeners
      const updatedConfig = await this.getConfig();
      this.notifyListeners(updatedConfig);

    } catch (error) {
      this.db.exec('ROLLBACK');
      console.error('❌ Erro ao salvar configuração no SQLite:', error);
      throw error;
    }
  }

  private async saveConfigHistory(config: SystemConfig, reason: string): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO config_history (config_snapshot, change_reason) 
        VALUES (?, ?)
      `);
      
      stmt.run([JSON.stringify(config), reason]);
      stmt.free();
      
    } catch (error) {
      console.warn('⚠️ Erro ao salvar histórico:', error);
    }
  }

  async getConfigHistory(limit: number = 10): Promise<Array<{id: number, config: SystemConfig, reason: string, date: string}>> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      const stmt = this.db.prepare(`
        SELECT id, config_snapshot, change_reason, created_at 
        FROM config_history 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      
      const rows = [];
      stmt.bind([limit]);
      
      while (stmt.step()) {
        const row = stmt.getAsObject();
        rows.push({
          id: row.id,
          config: JSON.parse(row.config_snapshot as string),
          reason: row.change_reason as string,
          date: row.created_at as string
        });
      }
      
      stmt.free();
      return rows;
      
    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      return [];
    }
  }

  private async persistDatabase(): Promise<void> {
    try {
      const data = this.db.export();
      const jsonData = JSON.stringify(Array.from(data));
      localStorage.setItem('kiosk_config_db', jsonData);
      console.log('💾 Banco SQLite persistido no localStorage');
    } catch (error) {
      console.error('❌ Erro ao persistir banco:', error);
    }
  }

  async resetToDefault(reason: string = 'Reset para configuração padrão'): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Salvar histórico antes do reset
      const currentConfig = await this.getConfig();
      await this.saveConfigHistory(currentConfig, reason);

      // Limpar configurações
      this.db.exec('DELETE FROM config');
      
      // Inserir configuração padrão
      await this.saveConfig(DEFAULT_CONFIG, reason);
      
      console.log('🔄 Configuração resetada para padrão');
      
    } catch (error) {
      console.error('❌ Erro ao resetar configuração:', error);
      throw error;
    }
  }

  getApiUrl(): string {
    // Método síncrono que usa cache
    const cachedConfig = this.getCachedConfig();
    const url = `http://${cachedConfig.apiHost}:${cachedConfig.apiPort}`;
    console.log('🔗 URL da API:', url);
    return url;
  }

  private getCachedConfig(): SystemConfig {
    try {
      const cached = localStorage.getItem('kiosk_config_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('⚠️ Erro ao carregar cache de configuração');
    }
    return DEFAULT_CONFIG;
  }

  private updateCache(config: SystemConfig): void {
    try {
      localStorage.setItem('kiosk_config_cache', JSON.stringify(config));
    } catch (e) {
      console.warn('⚠️ Erro ao atualizar cache de configuração');
    }
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
    this.updateCache(config);
    
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
    
    return JSON.stringify({
      current_config: config,
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

  async debugInfo(): Promise<void> {
    console.group('🔍 Debug SQLite Config Database');
    
    try {
      const config = await this.getConfig();
      const history = await this.getConfigHistory(3);
      
      console.log('📊 Status:', {
        initialized: this.isInitialized,
        listeners: this.listeners.length
      });
      
      console.log('⚙️ Configuração Atual:', config);
      console.log('📚 Histórico (últimas 3):', history);
      console.log('🔗 URL da API:', this.getApiUrl());
      
      // Verificar tamanho do banco
      const dbSize = localStorage.getItem('kiosk_config_db')?.length || 0;
      console.log('💾 Tamanho do banco:', `${Math.round(dbSize / 1024)}KB`);
      
    } catch (error) {
      console.error('❌ Erro no debug:', error);
    }
    
    console.groupEnd();
  }
}

// Instância singleton
export const configDB = new ConfigDatabase();

// Compatibilidade com o sistema antigo
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
  }
}; 