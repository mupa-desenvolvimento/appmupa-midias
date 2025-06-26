export interface SystemConfig {
  apiHost: string;
  apiPort: number;
  deviceId: string;
  codUser: string;
  deviceNickname: string;
  codUserResponse?: any;
  userId?: string;
  empresaId?: string;
  selectedGroupId?: string;
  selectedGroupName?: string;
  userResponse?: any;
  groupsResponse?: any;
  mediaPlaylist?: any[];
  companyName?: string;
  companyId?: string;
  group?: string;
  activeLayout: number;
  timeoutDuration: number;
  syncInterval: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  apiHost: '192.168.1.4',
  apiPort: 5000,
  deviceId: '',
  codUser: '',
  deviceNickname: '',
  activeLayout: 1,
  timeoutDuration: 30000,
  syncInterval: 300000
};

const CONFIG_STORAGE_KEY = 'system_config';

// Sistema de notificação para mudanças de configuração
type ConfigChangeListener = (config: SystemConfig) => void;
const configListeners: ConfigChangeListener[] = [];

export const ConfigManager = {
  getConfig(): SystemConfig {
    try {
      // Verificar múltiplas chaves de configuração (para limpeza de cache antigo)
      const possibleKeys = [
        CONFIG_STORAGE_KEY,
        'system_config_v2',
        'kiosk_config',
        'mupa_kiosk_config'
      ];

      let savedConfig = null;
      let usedKey = null;

      // Procurar por configuração salva em qualquer das chaves
      for (const key of possibleKeys) {
        const config = localStorage.getItem(key);
        if (config) {
          savedConfig = config;
          usedKey = key;
          break;
        }
      }

      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        
        // Verificar se o IP é um dos antigos problemáticos
        const problematicIPs = ['192.168.6.163', '192.168.100.67', '192.168.1.5', '192.168.1.10'];
        if (problematicIPs.includes(parsedConfig.apiHost)) {
          console.warn('🔄 IP antigo detectado, atualizando para:', DEFAULT_CONFIG.apiHost);
          parsedConfig.apiHost = DEFAULT_CONFIG.apiHost;
          parsedConfig.apiPort = DEFAULT_CONFIG.apiPort;
          
          // Salvar configuração corrigida
          this.saveConfig(parsedConfig);
        }

        // Se usou uma chave diferente da padrão, migrar
        if (usedKey !== CONFIG_STORAGE_KEY) {
          console.log('🔄 Migrando configuração para chave padrão');
          localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(parsedConfig));
          localStorage.removeItem(usedKey);
        }

        console.log('Configurações carregadas:', parsedConfig);
        return { ...DEFAULT_CONFIG, ...parsedConfig };
      }
      
      console.log('Usando configurações padrão:', DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(config: Partial<SystemConfig>): void {
    try {
      const currentConfig = this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      console.log('Salvando configurações:', newConfig);
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
      
      // Notificar todos os listeners sobre a mudança
      configListeners.forEach(listener => {
        try {
          listener(newConfig);
        } catch (e) {
          console.error('Erro ao notificar listener:', e);
        }
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw error;
    }
  },

  getApiUrl(): string {
    const config = this.getConfig();
    const url = `http://${config.apiHost}:${config.apiPort}`;
    console.log('URL da API configurada:', url);
    return url;
  },

  // Método para exportar configurações para arquivo
  exportConfig(): string {
    const config = this.getConfig();
    return JSON.stringify(config, null, 2);
  },

  // Método para importar configurações de arquivo
  importConfig(configString: string): boolean {
    try {
      const config = JSON.parse(configString);
      // Validar se tem os campos obrigatórios
      if (config.apiHost && config.apiPort) {
        this.saveConfig(config);
        console.log('Configurações importadas com sucesso:', config);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      return false;
    }
  },

  // Método para validar se a configuração é válida
  isConfigValid(): boolean {
    const config = this.getConfig();
    return !!(config.apiHost && config.apiPort && config.deviceId);
  },

  // Método para resetar configurações para o padrão
  resetToDefault(): void {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    console.log('Configurações resetadas para o padrão');
  },

  // Método de debug para verificar o estado das configurações
  debugConfig(): void {
    console.group('🔧 Debug de Configurações');
    console.log('Default Config:', DEFAULT_CONFIG);
    console.log('LocalStorage Key:', CONFIG_STORAGE_KEY);
    console.log('Saved Config (raw):', localStorage.getItem(CONFIG_STORAGE_KEY));
    
    try {
      const parsed = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (parsed) {
        console.log('Saved Config (parsed):', JSON.parse(parsed));
      }
    } catch (e) {
      console.error('Erro ao fazer parse da config salva:', e);
    }
    
    console.log('Current Config:', this.getConfig());
    console.log('API URL:', this.getApiUrl());
    console.log('Is Valid:', this.isConfigValid());
    
    // Listar todas as chaves do localStorage relacionadas
    const allKeys = Object.keys(localStorage);
    const configKeys = allKeys.filter(key => key.includes('config') || key.includes('api') || key.includes('system'));
    console.log('Related localStorage keys:', configKeys);
    
    configKeys.forEach(key => {
      console.log(`${key}:`, localStorage.getItem(key));
    });
    
    console.groupEnd();
  },

  // Métodos para o sistema de observação
  addConfigListener(listener: ConfigChangeListener): () => void {
    configListeners.push(listener);
    // Retorna função para remover o listener
    return () => {
      const index = configListeners.indexOf(listener);
      if (index > -1) {
        configListeners.splice(index, 1);
      }
    };
  },

  // Força a notificação de todos os listeners (útil após mudanças manuais)  
  notifyConfigChange(): void {
    const currentConfig = this.getConfig();
    configListeners.forEach(listener => {
      try {
        listener(currentConfig);
      } catch (e) {
        console.error('Erro ao notificar listener:', e);
      }
    });
  },

  // Método para forçar atualização e limpeza de caches antigos
  forceRefresh(): void {
    console.log('🔄 Forçando atualização de configurações...');
    
    // Limpar possíveis caches antigos
    const oldKeys = [
      'system_config_v2',
      'kiosk_config', 
      'mupa_kiosk_config',
      'api_config',
      'vite_config',
      'proxy_config'
    ];
    
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log('🗑️ Removendo cache antigo:', key);
        localStorage.removeItem(key);
      }
    });

    // Recarregar configuração
    const config = this.getConfig();
    
    // Forçar notificação
    this.notifyConfigChange();
    
    console.log('✅ Configurações atualizadas:', config);
  },

  // Método para verificar e corrigir IPs problemáticos
  checkAndFixProblematicIPs(): boolean {
    const config = this.getConfig();
    const problematicIPs = ['192.168.6.163', '192.168.100.67', '192.168.1.5', '192.168.1.10'];
    
    if (problematicIPs.includes(config.apiHost)) {
      console.warn('⚠️ IP problemático detectado:', config.apiHost);
      console.log('🔧 Corrigindo para:', DEFAULT_CONFIG.apiHost);
      
      this.saveConfig({
        apiHost: DEFAULT_CONFIG.apiHost,
        apiPort: DEFAULT_CONFIG.apiPort
      });
      
      return true; // Indica que houve correção
    }
    
    return false; // Nenhuma correção necessária
  },

  // Método para diagnóstico completo
  fullDiagnostic(): void {
    console.group('🔍 Diagnóstico Completo de Configurações');
    
    // Verificar todas as chaves do localStorage
    console.log('📋 Todas as chaves do localStorage:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('config') || key.includes('api') || key.includes('system'))) {
        const value = localStorage.getItem(key);
        console.log(`  ${key}:`, value);
      }
    }
    
    // Debug normal
    this.debugConfig();
    
    // Verificar IPs problemáticos
    const hadProblems = this.checkAndFixProblematicIPs();
    if (hadProblems) {
      console.log('✅ Problemas de IP corrigidos automaticamente');
    } else {
      console.log('✅ Nenhum problema de IP detectado');
    }
    
    console.groupEnd();
  }
};

export const API_CONFIG = {
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'http://srv-mupa.ddns.net:5678'
    : 'http://localhost:5555',
  endpoints: {
    storage: {
      upload: '/storage/upload',
      list: '/storage/arquivos',
      download: '/storage/download'
    }
  }
}; 