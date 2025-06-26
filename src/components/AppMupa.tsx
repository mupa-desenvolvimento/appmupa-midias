import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppMode } from '../hooks/useAppMode';
import { useAudio } from '../contexts/AudioContext';
import { AppConfig, MediaItem } from '../types';
import MediaPlayer from './MediaPlayer';
import ConsultationScreen from './ConsultationScreen';
import ConfigScreen from './ConfigScreen';
import { Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfigManager, SystemConfig } from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { database } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { MediaService } from '@/lib/api/medias';
import { mediaCacheService } from '@/lib/services/MediaCacheService';

// Função debounce customizada
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

const AppMupa = () => {
  const { mode, switchToConsultation, switchToMedia, switchToConfig } = useAppMode();
  const { stopCurrentAudio } = useAudio();
  const [config, setConfig] = useState<SystemConfig>(ConfigManager.getConfig());
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isConfigScreen, setIsConfigScreen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [deviceSerial] = useState(() => {
    // Gera um serial único para o dispositivo se não existir
    const existingSerial = localStorage.getItem('device_serial');
    if (existingSerial) return existingSerial;
    
    const newSerial = `MUPA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    localStorage.setItem('device_serial', newSerial);
    return newSerial;
  });

  // Estados para o pop-up de autenticação de config
  const [isConfigAuthOpen, setIsConfigAuthOpen] = useState(false);
  const [configAuthCode, setConfigAuthCode] = useState('');
  const [configAuthError, setConfigAuthError] = useState<string | null>(null);

  // Estado para a atualização em background
  const [isUpdating, setIsUpdating] = useState(false);
  const lastUpdateTimeUpdate = useRef<string | null>(null);
  const lastUpdateHour = useRef<number | null>(null);

  const debouncedStopAudio = useCallback(debounce(() => {
    stopCurrentAudio();
  }, 300), [stopCurrentAudio]);

  // Função para verificar se é hora de atualizar
  const shouldUpdate = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Lista de horários para atualização
    const updateHours = [6, 8, 10, 12, 14, 16, 18, 20, 22];
    
    // Se já atualizou nesta hora, não atualizar novamente
    if (lastUpdateHour.current === currentHour) {
      return false;
    }
    
    // Verificar se a hora atual está na lista de horários de atualização
    if (updateHours.includes(currentHour)) {
      lastUpdateHour.current = currentHour;
      return true;
    }
    
    return false;
  };

  // Efeito para verificar atualizações automáticas
  useEffect(() => {
    if (!config.selectedGroupId || mode !== 'media') return;

    const checkForUpdates = async () => {
      if (shouldUpdate()) {
        console.log(`🕒 Iniciando atualização automática às ${new Date().toLocaleTimeString()}`);
        try {
          setIsUpdating(true);
          const response = await MediaService.getMediasByGroupId(config.selectedGroupId);
          
          if (!response.success) {
            throw new Error(response.message || 'Erro ao atualizar mídias');
          }

          const newMedias = response.data?.response?.medias || [];
          
          // Limpar cache antigo
          await mediaCacheService.clearCache();
          
          // Cachear novas mídias
          const cachePromises = newMedias.map(media => {
            const mediaUrl = media.url_download || media.link || media.final || media.url || '';
            if (mediaUrl) {
              const mediaType = media.type || (mediaUrl.includes('.mp4') ? 'video' : 'image');
              return mediaCacheService.cacheMedia(mediaUrl, mediaType);
            }
            return Promise.resolve();
          });
          
          await Promise.all(cachePromises);

          // Atualizar playlist
          setConfig(prevConfig => ({
            ...prevConfig,
            mediaPlaylist: newMedias
          }));

          console.log(`✅ Atualização automática concluída às ${new Date().toLocaleTimeString()}`);
        } catch (error) {
          console.error('❌ Erro na atualização automática:', error);
        } finally {
          setIsUpdating(false);
        }
      }
    };

    // Verificar a cada minuto
    const interval = setInterval(checkForUpdates, 60000);

    // Verificar imediatamente na montagem
    checkForUpdates();

    return () => clearInterval(interval);
  }, [config.selectedGroupId, mode]);

  // Listener do Firebase para atualizações em tempo real
  useEffect(() => {
    if (mode !== 'media' || !config.selectedGroupId) {
      return;
    }

    const groupId = config.selectedGroupId;
    const updateRef = ref(database, groupId);

    console.log(`🔌 Conectando listener do Firebase para o grupo ${groupId}...`);

    const listener = onValue(updateRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.time_update) {
        console.log(`🔥 Firebase: Recebido time_update: ${data.time_update}, último: ${lastUpdateTimeUpdate.current}`);
        
        // Se não houver último update ou se o update for diferente
        if (!lastUpdateTimeUpdate.current || lastUpdateTimeUpdate.current !== data.time_update) {
          console.log(`🔄 Firebase: Novo time_update detectado. Iniciando atualização...`);
          lastUpdateTimeUpdate.current = data.time_update;
          
          // Iniciar atualização em background
          const syncInBackground = async () => {
            setIsUpdating(true);
            try {
              console.log('🔄 Iniciando busca de mídias do grupo...');
              const response = await MediaService.getMediasByGroupId(groupId);
              
              if (!response.success) {
                throw new Error(`Erro na resposta: ${response.message || 'Erro desconhecido'}`);
              }
              
              if (!response.data?.response?.medias) {
                throw new Error('Resposta não contém mídias');
              }

              const newMedias = response.data.response.medias;
              console.log(`🔄 Atualização: ${newMedias.length} novas mídias encontradas. Iniciando cache em background...`);

              // Limpar cache antigo antes de cachear novas mídias
              await mediaCacheService.clearCache();
              console.log('🧹 Cache antigo limpo.');

              // Cachear todas as novas mídias em background e aguardar a conclusão
              const cachePromises = newMedias.map(media => {
                const mediaUrl = media.url_download || media.link || media.final || media.url || '';
                if (mediaUrl) {
                  const mediaType = media.type || (mediaUrl.includes('.mp4') ? 'video' : 'image');
                  return mediaCacheService.cacheMedia(mediaUrl, mediaType)
                    .catch(error => {
                      console.error(`❌ Erro ao cachear mídia ${mediaUrl}:`, error);
                      return null;
                    });
                }
                return Promise.resolve();
              });
              
              await Promise.all(cachePromises);
              console.log('✅ Todos os novos arquivos foram cacheados.');

              // AGORA, com tudo em cache, atualiza a playlist no estado
              setConfig(prevConfig => ({
                ...prevConfig,
                mediaPlaylist: newMedias
              }));
              console.log('✅ Playlist atualizada em background com sucesso!');
            } catch (error) {
              console.error('❌ Erro durante a sincronização em background:', error);
            } finally {
              setIsUpdating(false);
            }
          };

          // Executar a sincronização
          syncInBackground().catch(error => {
            console.error('❌ Erro ao executar sincronização:', error);
            setIsUpdating(false);
          });
        } else {
          console.log('🔄 Firebase: time_update é o mesmo, ignorando atualização.');
        }
      }
    }, (error) => {
      console.error('❌ Erro no listener do Firebase:', error);
    });

    // Função de limpeza para remover o listener
    return () => {
      console.log(`🔌 Desconectando listener do Firebase para o grupo ${groupId}.`);
      off(updateRef, 'value', listener);
    };
  }, [mode, config.selectedGroupId, mediaCacheService]);

  // Foca o input após interação do usuário
  useEffect(() => {
    if (!isConfigScreen && hasUserInteracted && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isConfigScreen, hasUserInteracted]);

  // Marca que o usuário interagiu (primeiro clique/tap)
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
    };
    document.addEventListener('click', handleUserInteraction, { once: true });
    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    setIsConfigScreen(mode === 'config');
  }, [mode]);

  const handleConfigSave = (newConfig: SystemConfig) => {
    ConfigManager.saveConfig(newConfig);
    setConfig(newConfig);
    console.log('Config salva:', newConfig);
    switchToMedia();
  };

  const handleOpenConfig = () => {
    // Resetar estado do popup ao abrir
    setConfigAuthCode('');
    setConfigAuthError(null);
    setIsConfigAuthOpen(true);
  };

  const handleConfigAuth = () => {
    if (configAuthCode === config.codUser) {
      setIsConfigAuthOpen(false);
      switchToConfig();
    } else {
      setConfigAuthError('Código incorreto. Tente novamente.');
    }
  };

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeValue(e.target.value);
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value;
      if (value.length >= 4) {
        console.log('🔍 Nova consulta iniciada, parando áudio atual...');
        debouncedStopAudio();
        setScannedBarcode(value);
        switchToConsultation();
        setBarcodeValue('');
      }
    }
  };

  // Foco automático sempre que não estiver na tela de configuração e estiver na tela de conteúdo
  useEffect(() => {
    if (mode === 'media' && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
      console.log('🎯 Input focado automaticamente');
    }
  }, [mode]);

  // Foco automático quando retornar da tela de consulta
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (mode === 'media') {
      // Pequeno delay para garantir que a transição de tela já ocorreu
      timeoutId = setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
          console.log('🎯 Input focado após retorno da consulta');
        }
      }, 100);
    }
    return () => clearTimeout(timeoutId);
  }, [mode]);

  // Show config screen if not configured OR if no group is selected
  if (!config.selectedGroupId) {
    return <ConfigScreen isActive={true} onConfigSave={handleConfigSave} onCancel={switchToMedia} />;
  }

  console.log('Layout ativo:', config.activeLayout);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black transition-all duration-300 ease-in-out">
      {/* Input invisível para leitura de código de barras */}
      <input
        ref={inputRef}
        id="input_barcode"
        type="text"
        value={barcodeValue}
        onChange={handleBarcodeInput}
        onKeyDown={handleBarcodeKeyDown}
        autoFocus
        tabIndex={0}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1, // Garante que não interfira com outros elementos
        }}
      />

      {/* Media Player */}
      {mode === 'media' && (
        <MediaPlayer
          isActive={true}
          playlist={config.mediaPlaylist || []}
          groupId={config.selectedGroupId}
          deviceSerial={deviceSerial}
        />
      )}

      {/* Consultation Screen */}
      <ConsultationScreen 
        isActive={mode === 'consultation'} 
        onTimeout={switchToMedia}
        layout={config.activeLayout}
        barcode={scannedBarcode}
      />

      {/* Config Screen */}
      <ConfigScreen 
        isActive={mode === 'config'} 
        onConfigSave={handleConfigSave}
        onCancel={switchToMedia}
      />

      {/* Botão de configuração - apenas no modo mídia */}
      {mode === 'media' && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={handleOpenConfig}
            size="sm"
            variant="ghost"
            className="rounded-full p-3 opacity-0"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Indicador de atualização em background */}
      {isUpdating && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 text-white text-sm shadow-lg">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Atualizando conteúdo...</span>
        </div>
      )}

      {/* Popup de autenticação para acessar config */}
      <Dialog open={isConfigAuthOpen} onOpenChange={setIsConfigAuthOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-[#27272A] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Acesso Restrito</DialogTitle>
            <DialogDescription className="text-gray-400">
              Para acessar as configurações, por favor, insira o código do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="config-code" className="text-right text-gray-300">
                Código
              </Label>
              <Input
                id="config-code"
                type="password"
                value={configAuthCode}
                onChange={(e) => setConfigAuthCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfigAuth()}
                className="col-span-3 bg-[#18181B] border-[#27272A] text-white"
                autoFocus
              />
            </div>
            {configAuthError && (
              <p className="text-red-500 text-sm col-span-4 text-center">{configAuthError}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfigAuthOpen(false)} className="bg-transparent border-[#27272A] text-gray-300 hover:bg-[#27272A] hover:text-white">Cancelar</Button>
            <Button type="submit" onClick={handleConfigAuth} className="bg-white text-black hover:bg-gray-200">Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppMupa;
