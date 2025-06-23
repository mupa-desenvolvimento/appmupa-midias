import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ConfigManager } from '../lib/config';
import { SystemConfig } from '../lib/config';

interface ConfigDebugProps {
  onClose: () => void;
}

export const ConfigDebug: React.FC<ConfigDebugProps> = ({ onClose }) => {
  const [currentConfig, setCurrentConfig] = useState<SystemConfig | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const loadCurrentConfig = () => {
    try {
      const config = ConfigManager.getConfig();
      setCurrentConfig(config);
      addLog(`✅ Configuração carregada: ${JSON.stringify(config)}`);
    } catch (error) {
      addLog(`❌ Erro ao carregar configuração: ${error}`);
    }
  };

  const runFullDiagnostic = async () => {
    addLog('🔍 Iniciando diagnóstico completo...');
    
    try {
      // Executar diagnóstico
      ConfigManager.fullDiagnostic();
      
      // Verificar localStorage
      addLog('📋 Verificando localStorage...');
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('config') || key.includes('api') || key.includes('system'))) {
          allKeys.push(key);
        }
      }
      addLog(`📋 Chaves encontradas: ${allKeys.join(', ')}`);
      
      // Testar URL da API
      const apiUrl = ConfigManager.getApiUrl();
      addLog(`🔗 URL da API: ${apiUrl}`);
      
      // Testar conexão
      try {
        const response = await fetch('/api/status');
        addLog(`🌐 Teste de conexão: ${response.status} - ${response.statusText}`);
      } catch (error) {
        addLog(`🌐 Erro na conexão: ${error}`);
      }
      
      // Recarregar configuração
      loadCurrentConfig();
      
      addLog('✅ Diagnóstico concluído');
      
    } catch (error) {
      addLog(`❌ Erro no diagnóstico: ${error}`);
    }
  };

  const forceUpdateConfig = async () => {
    addLog('🔧 Forçando atualização de configuração...');
    
    try {
      // Salvar configuração com IP correto
      await ConfigManager.saveConfig({
        apiHost: '192.168.1.10',
        apiPort: 5000
      });
      
      // Forçar refresh
      ConfigManager.forceRefresh();
      
      addLog('✅ Configuração atualizada');
      loadCurrentConfig();
      
    } catch (error) {
      addLog(`❌ Erro ao atualizar: ${error}`);
    }
  };

  const clearAllAndReload = () => {
    addLog('🗑️ Limpando tudo e recarregando...');
    
    setTimeout(() => {
      localStorage.clear();
      window.location.reload();
    }, 1000);
  };

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Debug de Configurações</h2>
          <Button onClick={onClose} variant="outline">
            ✕ Fechar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Configuração Atual */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuração Atual</h3>
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto">
                {currentConfig ? JSON.stringify(currentConfig, null, 2) : 'Carregando...'}
              </pre>
            </div>
            
            <div className="space-y-2">
              <Button onClick={loadCurrentConfig} className="w-full">
                🔄 Recarregar Configuração
              </Button>
              <Button onClick={runFullDiagnostic} className="w-full">
                🔍 Diagnóstico Completo
              </Button>
              <Button onClick={forceUpdateConfig} className="w-full bg-blue-600 hover:bg-blue-700">
                🔧 Forçar Atualização
              </Button>
              <Button onClick={clearAllAndReload} className="w-full bg-red-600 hover:bg-red-700">
                🗑️ Limpar Tudo e Recarregar
              </Button>
            </div>
          </div>

          {/* Logs */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Logs de Debug</h3>
              <Button onClick={() => setLogs([])} variant="outline" size="sm">
                🗑️ Limpar Logs
              </Button>
            </div>
            
            <div className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">Nenhum log ainda...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Informações Importantes:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• O sistema usa proxy do Vite para evitar problemas de CORS</li>
            <li>• Configurações são salvas no localStorage</li>
            <li>• O diagnóstico pode detectar e corrigir IPs antigos automaticamente</li>
            <li>• Em caso de problemas persistentes, use "Limpar Tudo e Recarregar"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}; 