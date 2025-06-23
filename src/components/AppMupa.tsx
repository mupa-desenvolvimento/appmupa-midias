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

  // Estados para o pop-up de autenticação de config
  const [isConfigAuthOpen, setIsConfigAuthOpen] = useState(false);
  const [configAuthCode, setConfigAuthCode] = useState('');
  const [configAuthError, setConfigAuthError] = useState<string | null>(null);

  // Estado para a atualização em background
  const [isUpdating, setIsUpdating] = useState(false);
  const lastUpdateTimeUpdate = useRef<string | null>(null);

  const debouncedStopAudio = useCallback(debounce(() => {
    stopCurrentAudio();
  }, 300), [stopCurrentAudio]);

  // Listener do Firebase para atualizações em tempo real
  useEffect(() => {
    if (mode !== 'media' || !config.selectedGroupId) {
      return;
    }

    const groupId = config.selectedGroupId;
    const updateRef = ref(database, groupId);

    const listener = onValue(updateRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.time_update) {
        if (lastUpdateTimeUpdate.current && lastUpdateTimeUpdate.current === data.time_update) {
          console.log('🔄 Firebase: time_update é o mesmo, ignorando atualização.');
          return;
        }

        console.log(`🔥 Firebase: Recebido sinal de atualização para o grupo ${groupId} com time_update: ${data.time_update}`);
        lastUpdateTimeUpdate.current = data.time_update;
        
        // Iniciar atualização em background
        const syncInBackground = async () => {
          setIsUpdating(true);
          try {
            const response = await MediaService.getMediasByGroupId(groupId);
            if (response.success && response.data?.response?.medias) {
              const newMedias = response.data.response.medias;
              console.log(`🔄 Atualização: ${newMedias.length} novas mídias encontradas. Iniciando cache em background...`);

              // Cachear todas as novas mídias em background e aguardar a conclusão
              const cachePromises = newMedias.map(media => {
                const mediaUrl = media.url_download || media.link || media.final || media.url || '';
                if (mediaUrl) {
                   const mediaType = media.type || (mediaUrl.includes('.mp4') ? 'video' : 'image');
                   // cacheMedia agora retorna uma URL (blob ou original), mas o importante é que ela salva no cache
                   return mediaCacheService.cacheMedia(mediaUrl, mediaType);
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
            }
          } catch (error) {
            console.error('❌ Erro durante a sincronização em background:', error);
          } finally {
            setIsUpdating(false);
          }
        };

        syncInBackground();
      }
    });

    // Função de limpeza para remover o listener
    return () => {
      console.log(`🔌 Desconectando listener do Firebase para o grupo ${groupId}.`);
      off(updateRef, 'value', listener);
    };

  }, [mode, config.selectedGroupId]);

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
    return <ConfigScreen isActive={true} onConfigSave={handleConfigSave} />;
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
      <MediaPlayer 
        isActive={mode === 'media'}
        playlist={config.mediaPlaylist || []}
        groupId={config.selectedGroupId}
      />

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
