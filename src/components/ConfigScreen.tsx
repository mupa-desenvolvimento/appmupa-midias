import { useState, useEffect } from 'react';
import { Settings, QrCode, Wifi, WifiOff, RotateCcw, ChevronLeft, ChevronRight, Check, Monitor, Network, Wrench, Database, User, Users, Library, CheckCircle2, CloudDownload, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ConfigManager, SystemConfig } from '@/lib/config';
import { useLog } from '@/contexts/LogContext';
import { ConfigDebug } from './ConfigDebug';
import CacheManager from './CacheManager';
import { AuthService } from '@/lib/api/auth';
import { MediaService } from '@/lib/api/medias';
import { mediaCacheService } from '@/lib/services/MediaCacheService';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';

interface ConfigScreenProps {
  isActive: boolean;
  onConfigSave: (config: SystemConfig) => void;
  onCancel: () => void;
}

const ConfigScreen = ({ isActive, onConfigSave, onCancel }: ConfigScreenProps) => {
  const { addLog } = useLog();
  const [config, setConfig] = useLocalStorage<SystemConfig>('system-config', ConfigManager.getConfig());
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [showCacheManager, setShowCacheManager] = useState(false);
  const [isTestingCodUser, setIsTestingCodUser] = useState(false);
  const [codUserStatus, setCodUserStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [codUserResponse, setCodUserResponse] = useState<any>(null);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [groupsStatus, setGroupsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mediasStatus, setMediasStatus] = useState<'idle' | 'loading' | 'downloading' | 'success' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState({ total: 0, current: 0, currentMediaName: '' });
  const [error, setError] = useState<string | null>(null);
  const [deviceNickname, setDeviceNickname] = useState('');
  const [configFinalizada, setConfigFinalizada] = useState(false);
  const [showClearCache, setShowClearCache] = useState(false);

  type MediaStatus = 'idle' | 'loading' | 'downloading' | 'success' | 'error';

  const checkMediaStatus = (status: MediaStatus, expected: MediaStatus): boolean => status === expected;

  const getMediaStatusMessage = (status: MediaStatus) => {
    switch (status) {
      case 'idle': return 'Aguardando início';
      case 'loading': return 'Carregando lista de mídias';
      case 'downloading': return 'Baixando mídias';
      case 'success': return 'Sincronização concluída';
      case 'error': return 'Erro na sincronização';
    }
  };

  useEffect(() => {
    // Carregar apelido do dispositivo das configurações
    if (config.deviceNickname) {
      setDeviceNickname(config.deviceNickname);
    }
  }, [config.deviceNickname]);

  const steps = [
    { id: 1, title: 'Validação', description: 'Validação do código' },
    { id: 2, title: 'Apelido', description: 'Definição do apelido' },
    { id: 3, title: 'Grupo', description: 'Seleção do grupo' },
    { id: 4, title: 'Sincronização', description: 'Download do conteúdo' },
    { id: 5, title: 'Finalização', description: 'Revisar e ativar' }
  ];

  useEffect(() => {
    // Limpar configurações antigas forçadamente na montagem
    const currentConfig = ConfigManager.getConfig();
    console.log('🔧 Configuração atual carregada:', currentConfig);
    
    // Se ainda estiver com IP antigo, forçar limpeza
    if (currentConfig.apiHost === '192.168.100.67') {
      console.log('🧹 Detectado IP antigo, limpando configurações...');
      localStorage.clear();
      
      // Recarregar configuração padrão
      const freshConfig = ConfigManager.getConfig();
      setConfig(freshConfig);
      console.log('✅ Nova configuração carregada:', freshConfig);
    } else {
      setConfig(currentConfig);
    }
    
    // Debug das configurações na montagem do componente
    ConfigManager.debugConfig();
  }, []);

  useEffect(() => {
    // Iniciar sincronização automaticamente ao entrar na etapa 4
    if (currentStep === 4 && config.selectedGroupId && mediasStatus === 'idle') {
      const startSync = async () => {
        await syncMedias(config.selectedGroupId!);
      };
      startSync();
    }
  }, [currentStep, config.selectedGroupId, mediasStatus]);

  const fetchUserData = async () => {
    if (!codUserResponse?.response?.['dados-user']?._id) {
      addLog('❌ Resposta do CodUser inválida ou não testada ainda.', 'error');
      return;
    }

    const dadosUser = codUserResponse.response['dados-user'];
    const userId = dadosUser._id;
    const empresaId = dadosUser.Empresa;

    if (userId && empresaId) {
      setConfig(prevConfig => ({
        ...prevConfig,
        userId,
        empresaId,
        userResponse: dadosUser,
      }));
      addLog(`✅ Dados do usuário extraídos! User ID: ${userId}, Empresa ID: ${empresaId}`, 'success');
    } else {
      addLog('❌ Não foi possível extrair User ID ou Empresa ID da resposta.', 'error');
    }
  };

  // Buscar dados do usuário automaticamente quando codUser for testado
  useEffect(() => {
    if (codUserStatus === 'success' && codUserResponse?.response?.['dados-user'] && !config.userId) {
      console.log('🔄 CodUser testado com sucesso, buscando dados do usuário...');
      fetchUserData();
    }
  }, [codUserStatus, codUserResponse, config.userId]);

  const fetchGroups = async (empresaId: string): Promise<boolean> => {
    setGroupsStatus('loading');
    setError(null);
    if (!empresaId) {
      addLog('❌ Empresa ID não disponível para buscar grupos.', 'error');
      setGroupsStatus('error');
      setError('ID da empresa não encontrado.');
      return false;
    }
    
    try {
      const response = await AuthService.getGroups(empresaId);
      if (response.success && response.data?.response?.grupos) {
        setConfig(prevConfig => ({ ...prevConfig, groupsResponse: response.data }));
        setGroupsStatus('success');
        addLog(`✅ Grupos obtidos! Total: ${response.data.response.grupos.length || 0} grupos.`, 'success');
        return true;
      } else {
        setGroupsStatus('error');
        setError(response.message || 'Erro desconhecido ao buscar grupos.');
        addLog(`❌ Erro ao buscar grupos: ${response.message}`, 'error');
        return false;
      }
    } catch (error: any) {
      setGroupsStatus('error');
      setError(error.message || 'Falha na requisição de grupos.');
      addLog(`❌ Falha na requisição de grupos: ${error.message}`, 'error');
      return false;
    }
  };

  const syncMedias = async (groupId: string): Promise<boolean> => {
    if (!groupId) {
      setError('ID do grupo não fornecido');
      return false;
    }

    setMediasStatus('loading');
    setError(null);
    setDownloadProgress(0);
    setDownloadStats({ total: 0, current: 0, currentMediaName: '' });
    
    addLog(`⏳ Iniciando busca de mídias para o grupo ${groupId}...`);

    try {
      const response = await MediaService.getMediasByGroupId(groupId);
      if (!response.success || !response.data?.response?.medias) {
        throw new Error(response.message || 'Erro ao buscar mídias.');
      }

      const medias = response.data.response.medias;
      if (!medias.length) {
        setError('Nenhuma mídia encontrada para este grupo');
        setMediasStatus('error');
        return false;
      }

      setConfig(prevConfig => ({ ...prevConfig, mediaPlaylist: medias }));
      addLog(`✅ Lista de mídias obtida! Total: ${medias.length}. Iniciando download...`);

      setMediasStatus('downloading');
      setDownloadStats({ total: medias.length, current: 0, currentMediaName: '' });

      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < medias.length; i++) {
        const media = medias[i];
        const mediaUrl = media.url_download || media.link || media.final || media.url || '';
        
        if (!mediaUrl) {
          errors.push(`Mídia ${i + 1}: URL não encontrada`);
          continue;
        }

        try {
          const mediaType = media.type || (mediaUrl.includes('.mp4') ? 'video' : 'image');
          setDownloadStats(prev => ({
            ...prev,
            current: i + 1,
            currentMediaName: mediaUrl.split('/').pop() || mediaUrl
          }));
          
          await mediaCacheService.cacheMedia(mediaUrl, mediaType);
          successCount++;
          setDownloadProgress(((i + 1) / medias.length) * 100);
          addLog(`✅ Mídia ${i + 1}/${medias.length} baixada: ${mediaUrl}`, 'success');
        } catch (error: any) {
          errors.push(`Mídia ${i + 1}: ${error.message}`);
          addLog(`❌ Erro ao baixar mídia ${mediaUrl}: ${error.message}`, 'error');
        }
      }

      if (successCount === medias.length) {
        setMediasStatus('success');
        addLog(`✅ Todas as ${medias.length} mídias foram sincronizadas com sucesso!`, 'success');
        return true;
      } else {
        setMediasStatus('error');
        setError(`${errors.length} erro(s) durante a sincronização:\n${errors.join('\n')}`);
        return false;
      }
    } catch (error: any) {
      setMediasStatus('error');
      setError(error.message);
      addLog(`🚨 Falha grave ao sincronizar: ${error.message}`, 'error');
      return false;
    }
  };

  const handleGroupSelect = (group: any) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      selectedGroupId: group._id,
      selectedGroupName: group.Nome,
    }));
    addLog(`✅ Grupo selecionado: ${group.Nome} (${group._id})`, 'success');
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    
    try {
      // Usar o proxy do Vite para evitar problemas de CORS
      const proxyUrl = '/api/status';
      const directUrl = `http://${config.apiHost}:${config.apiPort}/api/status`;
      
      console.log('🔗 Testando conexão via proxy:', proxyUrl);
      console.log('🔗 URL direta:', directUrl);
      addLog(`Testando conexão: ${directUrl}`, 'info');
      
      let connectionSuccess = false;
      let lastError = null;
      
      try {
        console.log(`🔍 Tentando endpoint via proxy: ${proxyUrl}`);
        
        // Primeiro, tentar via proxy (sem CORS)
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 segundos de timeout
        });
        
        console.log(`📡 Resposta via proxy:`, response.status);
        
        if (response.ok) {
          // Endpoint respondeu com sucesso via proxy
          connectionSuccess = true;
          setConnectionStatus('success');
          addLog(`✅ API Status OK via proxy! (Status: ${response.status})`, 'success');
          
          // Tentar ler a resposta para mais detalhes
          try {
            const data = await response.json();
            console.log('📊 Dados do /api/status:', data);
            if (data.status === 'success') {
              addLog(`📊 API funcionando corretamente: ${data.message}`, 'success');
            } else {
              addLog(`📊 Resposta do status: ${JSON.stringify(data)}`, 'info');
            }
          } catch (e) {
            console.log('ℹ️ Resposta não é JSON, mas conexão OK');
          }
        } else if (response.status < 500) {
          // Aceitar respostas que não sejam erro de servidor
          connectionSuccess = true;
          setConnectionStatus('success');
          addLog(`✅ Servidor acessível via proxy (Status: ${response.status})`, 'success');
        }
      } catch (err: any) {
        console.log(`❌ Falha via proxy:`, err);
        lastError = err;
        
        // Se falhar via proxy, tentar direto (pode dar CORS mas confirma que API funciona)
        try {
          console.log(`🔍 Tentando endpoint direto: ${directUrl}`);
          
          const directResponse = await fetch(directUrl, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(3000) // Timeout menor para teste direto
          });
          
          if (directResponse.ok) {
            connectionSuccess = true;
            setConnectionStatus('success');
            addLog(`✅ API acessível diretamente! Proxy pode estar com problema.`, 'success');
          }
        } catch (directErr: any) {
          // Se o erro for de CORS mas sabemos que a API funciona
          if (directErr.message.includes('CORS') || directErr.message.includes('fetch')) {
            console.log('⚠️ Erro de CORS detectado - API provavelmente funciona mas sem headers CORS');
            setConnectionStatus('success');
            addLog(`⚠️ API online mas com problema de CORS`, 'info');
            addLog(`💡 Servidor funcionando: ${directUrl}`, 'info');
            addLog(`🔧 Usando proxy para contornar CORS`, 'info');
            connectionSuccess = true;
          }
        }
      }
      
      if (!connectionSuccess) {
        setConnectionStatus('error');
        const errorMessage = lastError?.name === 'TimeoutError' 
          ? 'Timeout: Servidor não responde'
          : `Erro de conexão: ${lastError?.message || 'Servidor não acessível'}`;
        addLog(errorMessage, 'error');
        addLog(`💡 Teste manual: abra ${directUrl} no navegador`, 'info');
      }
      
    } catch (error: any) {
      console.error('🚨 Erro geral no teste de conexão:', error);
      setConnectionStatus('error');
      const errorMessage = error.name === 'TimeoutError' 
        ? 'Timeout: Não foi possível conectar ao servidor'
        : `Erro de conexão: ${error.message}`;
      addLog(errorMessage, 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testCodUser = async () => {
    hideKeyboard(); // Ocultar teclado ao testar o código
    setIsTestingCodUser(true);
    setCodUserStatus('loading');
    setError(null);
    try {
      const response = await AuthService.postCodUser(config.codUser || '');
      setCodUserResponse(response.data); // Salva a resposta completa
      
      if (response.success && response.data?.response?.['dados-user']?.Empresa) {
        setCodUserStatus('success');
        addLog('✅ Código de usuário validado com sucesso!', 'success');
        // Extrai e salva o ID da empresa para uso posterior
        const empresaId = response.data.response['dados-user'].Empresa;
        setConfig(prev => ({ ...prev, empresaId }));
        addLog(`🏢 Empresa ID extraído: ${empresaId}`, 'info');

        // Atualiza o estado de conclusão
        setCompletedSteps(prev => [...new Set([...prev, 1])]);

      } else {
        setCodUserStatus('error');
        const errorMessage = response.message || 'Código de usuário inválido ou não encontrado.';
        setError(errorMessage);
        addLog(`❌ Erro ao validar código de usuário: ${errorMessage}`, 'error');
      }
    } catch (error: any) {
      setCodUserStatus('error');
      setError(error.message);
      addLog(`🚨 Falha grave ao testar código de usuário: ${error.message}`, 'error');
    } finally {
      setIsTestingCodUser(false);
    }
  };

  const hideKeyboard = () => {
    // Oculta o teclado virtual removendo o foco de qualquer input ativo
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  // Ocultar teclado quando o terminal for ativado
  useEffect(() => {
    if (isActive) {
      hideKeyboard();
    }
  }, [isActive]);

  const handleSave = async () => {
    hideKeyboard();
    try {
      // Gera um serial se não existir
      let serial = config.deviceId;
      if (!serial) {
        if (window.crypto?.randomUUID) {
          serial = window.crypto.randomUUID();
        } else {
          serial = Math.random().toString(36).substring(2, 15);
        }
      }
      addLog(`Enviando para backend: serial=${serial}, apelido=${config.deviceNickname}, empresa=${config.empresaId}, coduser=${config.codUser}`, 'info');
      const apiUrl = `/api/dispositivos`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial,
          status: 'online',
          apelido: config.deviceNickname,
          empresa: config.empresaId,
          coduser: config.codUser
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erro ao cadastrar dispositivo');
      const finalConfig = {
        ...config,
        deviceId: data.dispositivo.serial
      };
      ConfigManager.saveConfig(finalConfig);
      onConfigSave(finalConfig);
      setConfigFinalizada(true);
      addLog('✅ Dispositivo cadastrado e ativado!', 'success');
    } catch (err) {
      addLog('❌ Erro ao cadastrar dispositivo: ' + (err.message || err), 'error');
    }
  };

  const handleInputChange = (field: keyof SystemConfig, value: string | number) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      [field]: value,
    }));

    // Se o codUser for alterado, resetar o status e os dados relacionados
    if (field === 'codUser') {
      setCodUserStatus('idle');
      setGroupsStatus('idle');
      setConfig(prev => ({
        ...prev,
        empresaId: undefined,
        userId: undefined,
        groupsResponse: undefined,
        selectedGroupId: undefined,
        selectedGroupName: undefined,
      }));
      setCompletedSteps(prev => prev.filter(step => step !== 1 && step !== 2));
    }
  };

  const clearOldConfigs = () => {
    addLog('🗑️ Limpando configurações antigas do localStorage...', 'info');
    const keysToKeep = ['system-logs'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    // Força a recarga da página para obter a configuração padrão
    window.location.reload();
  };

  const forceReload = () => {
      window.location.reload();
  };

  const nextStep = async () => {
    hideKeyboard(); // Ocultar teclado ao avançar para próxima etapa
    if (!canProceed()) return;

    let success = true;

    switch (currentStep) {
      case 1:
        // Validação do código já foi feita
        setCompletedSteps(prev => [...new Set([...prev, 1])]);
        break;
      case 2:
        // Salvar apelido do dispositivo
        if (deviceNickname.trim()) {
          setConfig(prev => ({
            ...prev,
            deviceNickname: deviceNickname
          }));
          setCompletedSteps(prev => [...new Set([...prev, 2])]);
        } else {
          success = false;
          setError('Por favor, defina um apelido para o dispositivo');
        }
        break;
      case 3:
        // Grupo já foi selecionado
        if (config.selectedGroupId) {
          setCompletedSteps(prev => [...new Set([...prev, 3])]);
        } else {
          success = false;
          setError('Por favor, selecione um grupo');
        }
        break;
      case 4:
        // Verificar estado da sincronização
        switch (mediasStatus) {
          case 'success':
            setCompletedSteps(prev => [...new Set([...prev, 4])]);
            break;
          case 'error':
            success = false;
            setError('Houve um erro na sincronização. Por favor, tente novamente.');
            break;
          default:
            success = false;
            setError(`Aguarde: ${getMediaStatusMessage(mediasStatus)}`);
            break;
        }
        break;
      case 5:
        // Finalização e ativação
        handleSave();
        return; // Não avançar após salvar
    }

    if (success) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      setError(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepId: number) => {
    setCurrentStep(stepId);
  };

  // Validação de steps
  const isStepValid = (stepId: number) => {
    switch (stepId) {
      case 1: return codUserStatus === 'success' && !!config.userId;
      case 2: return !!deviceNickname && deviceNickname.trim().length > 0;
      case 3: return !!config.selectedGroupId;
      case 4: return mediasStatus === 'success';
      case 5: return !!config.selectedGroupId && !!config.mediaPlaylist && config.mediaPlaylist.length > 0;
      default: return false;
    }
  };

  const canProceed = () => {
    return isStepValid(currentStep);
  };

  const simulateQRScan = () => {
    const simulatedConfig: SystemConfig = {
      ...config,
      deviceId: 'TERMINAL-001',
      apiHost: '192.168.1.10',
      apiPort: 5000,
      activeLayout: 1,
      timeoutDuration: 30000,
      syncInterval: 300000
    };
    setConfig(simulatedConfig);
    addLog('Configuração simulada carregada', 'info', simulatedConfig);
  };

  // Renderizar conteúdo do step atual
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderCodUserStep();
      case 2:
        return renderDeviceNicknameStep();
      case 3:
        return renderGroupStep();
      case 4:
        return renderMediaSyncStep();
      case 5:
        return renderFinalStep();
      default:
        return null;
    }
  };

  const renderCodUserStep = () => (
    <div className="space-y-4 w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <User className="w-16 h-16 mx-auto text-primary mb-4" />
        <h3 className="text-2xl font-bold">Identificação do Dispositivo</h3>
        <p className="text-muted-foreground mt-2">Configure as informações básicas do dispositivo</p>
        </div>

        <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-muted/40 p-6 rounded-xl border border-border">
            <Label htmlFor="codUser" className="text-lg font-medium text-foreground mb-3 block">
              Código do Usuário *
          </Label>
            <div className="flex gap-2">
              <Input
                id="codUser"
                value={config.codUser}
                onChange={(e) => handleInputChange('codUser', e.target.value)}
                placeholder="Ex: mu04pa05"
            className="text-lg py-4 px-4 rounded-xl border-2"
          />
            <Button
                onClick={testCodUser}
                disabled={isTestingCodUser || !config.codUser}
                className="min-w-[100px]"
              >
                {isTestingCodUser ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Acessar App
                  </>
                )}
            </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Código único do usuário no sistema
            </p>
          </div>

          {codUserStatus === 'success' && codUserResponse?.response?.['dados-user'] && (
            <>
              <div className="bg-primary/10 p-6 rounded-xl border border-primary/20 text-center space-y-3">
                <p className="text-xl font-semibold text-primary">
                  🎉 Seja bem-vindo, {codUserResponse.response['dados-user'].nome_usuario}, ao dispositivo inteligente Mupa!
                </p>
                <p className="text-muted-foreground">
                  Aqui você consulta preços, descobre promoções do seu CPF e ainda recebe sugestões feitas só pra você.
                </p>
                </div>
            </>
          )}

          {codUserStatus === 'error' && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderDeviceNicknameStep = () => (
    <div className="space-y-4 w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <Monitor className="w-16 h-16 mx-auto text-primary mb-4" />
        <h3 className="text-2xl font-bold">Definição do Apelido</h3>
        <p className="text-muted-foreground mt-2">Configure o apelido do dispositivo</p>
            </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-muted/40 p-6 rounded-xl border border-border">
            <Label htmlFor="deviceNickname" className="text-lg font-medium text-foreground mb-3 block">
              Apelido do Dispositivo *
          </Label>
              <Input
              id="deviceNickname"
              value={deviceNickname}
              onChange={(e) => setDeviceNickname(e.target.value)}
              placeholder="Ex: Terminal Loja Centro"
              className="text-lg py-4 px-4 rounded-xl border-2"
              />
            <p className="text-sm text-muted-foreground mt-2">
              Nome amigável para identificar este dispositivo
          </p>
            </div>
        </div>
              </div>
            </div>
  );

  const renderGroupStep = () => (
    <div className="space-y-4 w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <Library className="w-16 h-16 mx-auto text-primary mb-4" />
        <h3 className="text-2xl font-bold">Seleção do Grupo</h3>
        <p className="text-muted-foreground mt-2">Escolha o grupo de conteúdo</p>
      </div>

      <div className="space-y-4">
        <div className="text-center">
          <div className="flex justify-center items-center gap-4">
            <Label className="text-xl font-bold">Selecione um Grupo de Mídia</Label>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchGroups(config.empresaId!)}
              disabled={groupsStatus === 'loading'}
              title="Atualizar lista de grupos"
            >
              <RotateCcw className={`h-4 w-4 ${groupsStatus === 'loading' ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha a qual coleção de mídias este dispositivo pertencerá.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-4 pt-4">
          {groupsStatus === 'success' && config.groupsResponse?.response?.grupos && config.groupsResponse.response.grupos.map((group: any) => {
            const isSelected = config.selectedGroupId === group._id;
            const mediaCount = group['lista-medias']?.length || 0;
            const lastModified = new Date(group['Modified Date']).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'short'
            });

            return (
              <div
                key={group._id}
                onClick={() => handleGroupSelect(group)}
                className={cn(
                  "relative flex flex-col items-center text-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-lg"
                    : "bg-card hover:bg-muted/50 border-card"
                )}
              >
                {isSelected && (
                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-primary-foreground" />
                )}
                <div className={cn(
                  "p-3 rounded-full mb-3",
                  isSelected ? "bg-primary-foreground/20" : "bg-muted"
                )}>
                  <Library className={cn("w-8 h-8", isSelected ? "text-primary-foreground" : "text-primary")} />
              </div>
                <div className="flex-1 mb-2">
                  <p className="font-bold text-base leading-tight">{group.Nome}</p>
                </div>
                <p className={cn("text-xs px-2 py-1 rounded-full", isSelected ? "bg-primary-foreground/20" : "bg-muted")}>
                  {mediaCount} mídias • {lastModified}
                </p>
              </div>
            );
          })}
          </div>
      </div>
    </div>
  );

  const renderMediaSyncStep = () => (
    <div className="space-y-4 w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <CloudDownload className="w-16 h-16 mx-auto text-primary mb-4" />
        <h3 className="text-2xl font-bold">Sincronização de Conteúdo</h3>
        <p className="text-muted-foreground mt-2">{getMediaStatusMessage(mediasStatus)}</p>
      </div>

      <div className="bg-muted/40 p-6 rounded-xl border border-border">
        {(mediasStatus === 'idle' || mediasStatus === 'loading') && (
          <div className="text-center">
            <p className="text-lg mb-4">Preparando para sincronização...</p>
            <Progress value={0} className="w-full h-2" />
            </div>
        )}

        {mediasStatus === 'downloading' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Baixando {downloadStats.current} de {downloadStats.total}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(downloadProgress)}%
              </span>
            </div>
            <Progress value={downloadProgress} className="w-full h-2" />
            <p className="text-sm text-muted-foreground truncate">
              {downloadStats.currentMediaName}
            </p>
        </div>
        )}

        {mediasStatus === 'success' && (
          <div className="text-center text-success">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
            <p className="text-lg font-medium">Sincronização Concluída!</p>
            <p className="text-sm text-muted-foreground mt-2">
              {downloadStats.total} mídias baixadas com sucesso
            </p>
          </div>
        )}

        {mediasStatus === 'error' && (
          <div className="text-center text-destructive">
            <p className="text-lg font-medium mb-2">Erro na Sincronização</p>
            <p className="text-sm whitespace-pre-line">{error}</p>
          <Button
            variant="outline"
              className="mt-4"
              onClick={() => syncMedias(config.selectedGroupId!)}
          >
              <RotateCcw className="w-4 h-4 mr-2" />
              Tentar Novamente
          </Button>
        </div>
        )}
      </div>
    </div>
  );

  const renderFinalStep = () => (
    <div className="space-y-6 w-full max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <CheckCircle2 className="w-16 h-16 mx-auto text-primary mb-4" />
        <h3 className="text-2xl font-bold">Configuração Concluída</h3>
        <p className="text-muted-foreground mt-2">Revise as informações e ative o dispositivo</p>
      </div>

      <div className="bg-muted/40 p-6 rounded-xl border border-border">
        <h4 className="font-semibold mb-4">Resumo da Configuração</h4>
        <div className="space-y-2">
          <p><strong>Apelido:</strong> {deviceNickname}</p>
          <p><strong>Grupo:</strong> {config.selectedGroupName}</p>
          <p><strong>Total de Mídias:</strong> {config.mediaPlaylist?.length || 0}</p>
        </div>
        </div>

      <div className="flex justify-center gap-4 mt-8">
        <Button variant="outline" size="lg" onClick={onCancel} className="text-lg px-8 py-6">
          <ChevronLeft className="w-5 h-5 mr-2" />
          Cancelar e Voltar
        </Button>
        <Button size="lg" onClick={handleSave} className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700">
          <Check className="w-5 h-5 mr-2" />
          Ativar Dispositivo
        </Button>
      </div>
    </div>
  );

  if (configFinalizada) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <img
          src="https://3ae4eb7cd71d409c5fc6c7861ea69db9.cdn.bubble.io/f1673900178083x912413083967604100/Untitled-1.svg"
          alt="Logo Mupa"
          className="w-32 h-32 mb-6"
          style={{ maxWidth: 160 }}
        />
        <CheckCircle2 className="w-16 h-16 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">
          Bem-vindo, {config.userResponse?.nome_usuario || "usuário"}!
        </h2>
        <p className="text-lg mb-6">Seu dispositivo foi ativado com sucesso.</p>
        <Button onClick={onCancel}>Fechar</Button>
      </div>
    );
  }

  if (!isActive) return null;

  return (
    <div className="relative dark flex h-screen bg-background text-foreground">
      {/* Botão de limpar cache no topo direito */}
      <div className="absolute top-6 right-6 z-50">
        <AlertDialog open={showClearCache} onOpenChange={setShowClearCache}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" title="Limpar Cache" onClick={() => setShowClearCache(true)}>
              <Trash2 className="w-6 h-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar cache?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso irá remover todas as configurações salvas e recarregar a página. Tem certeza que deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { localStorage.clear(); window.location.reload(); }}>Limpar e Recarregar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {/* Sidebar */}
      <div className="w-80 bg-muted/40 border-r border-border p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col items-center">
              <img
                src="https://3ae4eb7cd71d409c5fc6c7861ea69db9.cdn.bubble.io/f1673900178083x912413083967604100/Untitled-1.svg"
                alt="Logo Mupa"
                className="w-44 h-44 mb-2"
                style={{ maxWidth: 200 }}
              />
            </div>
          </div>
          <h1 className="text-xl font-semibold mb-10 text-center">Configuração App Mupa</h1>
          <nav className="space-y-4">
            {steps.map((step) => {
              const isStepActive = currentStep === step.id;
              const isStepCompleted = completedSteps.includes(step.id);
              return (
                  <button
                  key={step.id}
                  onClick={() => isStepCompleted && setCurrentStep(step.id)}
                  className={`w-full text-left flex items-start p-3 rounded-lg transition-colors ${
                    isStepActive
                      ? 'bg-primary text-primary-foreground'
                      : isStepCompleted
                      ? 'hover:bg-muted-foreground/10 text-muted-foreground'
                      : 'text-muted-foreground/50 cursor-not-allowed'
                  }`}
                  disabled={!isStepCompleted && !isStepActive}
                  >
                  <div className={`mr-4 mt-1 w-6 h-6 rounded-full flex items-center justify-center ${isStepActive || isStepCompleted ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                    {isStepCompleted ? <Check size={14} /> : <span className="text-sm">{step.id}</span>}
                  </div>
                  <div>
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-xs opacity-80">{step.description}</p>
                    </div>
                  </button>
              );
            })}
          </nav>
          </div>
        <div className="text-xs text-gray-500">
          App Version: 1.0.0
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-grow">
        <main className="flex-grow p-6 overflow-auto">
          {renderStepContent()}
        </main>
        {/* Footer / Navigation */}
        <footer className="flex justify-between items-center p-4 border-t border-border bg-background">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>
          <div className="text-sm text-muted-foreground">
            Etapa {currentStep} de {steps.length}
          </div>
          {currentStep === steps.length ? (
            <Button onClick={handleSave} disabled={!isStepValid(currentStep)}>
              Salvar e Iniciar
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!isStepValid(currentStep)}>
              Próximo <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ConfigScreen;
