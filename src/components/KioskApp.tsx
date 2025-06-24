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
import { useIdleTimer } from '@/hooks/useIdleTimer';
import { useToast } from '@/components/ui/use-toast';
import { Clock } from '@/components/ui/clock';

const KioskApp = () => {
  const { mode, switchToConsultation, switchToMedia, switchToConfig } = useAppMode();
  const { stopCurrentAudio } = useAudio();
  const [config, setConfig] = useState<SystemConfig>(ConfigManager.getConfig());
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [barcodeValue, setBarcodeValue] = useState('');
  const [isConfigAuthOpen, setIsConfigAuthOpen] = useState(false);
  const [configAuthCode, setConfigAuthCode] = useState('');
  const [configAuthError, setConfigAuthError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  const debouncedStopAudio = useCallback(() => {
    setTimeout(() => stopCurrentAudio(), 300);
  }, [stopCurrentAudio]);
  
  useIdleTimer(switchToMedia, 60000, mode === 'config');

  const hideKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  useEffect(() => {
    if (mode === 'media') {
      if (!isConfigAuthOpen) {
        hideKeyboard();
        inputRef.current?.focus();
      }
    } else {
      hideKeyboard();
    }
  }, [mode, isConfigAuthOpen]);

  const handleConfigSave = (newConfig: SystemConfig) => {
    ConfigManager.saveConfig(newConfig);
    setConfig(newConfig);
    switchToMedia();
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
      if (value === '9999') {
        setConfigAuthCode('');
        setConfigAuthError(null);
        setIsConfigAuthOpen(true);
        setBarcodeValue('');
        return;
      }
      if (value.length >= 4) {
        debouncedStopAudio();
        setScannedBarcode(value);
        switchToConsultation();
        setBarcodeValue('');
      }
    }
  };

  // Efeito para monitorar atualizações do Firebase
  useEffect(() => {
    if (!config.selectedGroupId) return;

    const updateRef = ref(database, config.selectedGroupId);
    console.log(`🔌 Conectando ao Firebase para o grupo ${config.selectedGroupId}...`);

    const listener = onValue(updateRef, async (snapshot) => {
      try {
        const val = snapshot.val();
        if (val) {
          console.log('🔄 Atualização detectada no Firebase:', val);
          setIsUpdating(true);

          // Buscar e atualizar mídias
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

          // Notificar sucesso
          toast({
            title: "Conteúdo Atualizado",
            description: `${newMedias.length} mídias sincronizadas com sucesso!`,
          });

        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro na sincronização';
        console.error('❌ Erro na sincronização:', message);
        
        toast({
          variant: "destructive",
          title: "Erro na Sincronização",
          description: message,
        });
      } finally {
        setIsUpdating(false);
      }
    });

    return () => {
      off(updateRef);
    };
  }, [config.selectedGroupId]);
  
  if (!config.selectedGroupId) {
    return <ConfigScreen isActive={true} onConfigSave={handleConfigSave} onCancel={switchToMedia} />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black transition-all duration-300 ease-in-out">
      {/* Input invisível para leitura de código de barras */}
      <input 
        ref={inputRef} 
        type="text" 
        value={barcodeValue} 
        onChange={handleBarcodeInput} 
        onKeyDown={handleBarcodeKeyDown} 
        autoFocus 
        className="opacity-0 w-1 h-1 absolute top-0 left-0"
        inputMode="none" 
      />

      {/* Relógio no canto superior esquerdo */}
      {mode === 'media' && (
        <>
          <div className="fixed top-4 left-4 z-50">
            <Clock />
          </div>
          <div className="fixed top-4 right-4 z-50">
            <button
              onClick={() => {
                setConfigAuthCode('');
                setConfigAuthError(null);
                setIsConfigAuthOpen(true);
              }}
              style={{ opacity: 0 }}
              className="bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full p-3 shadow-lg border border-zinc-700 focus:outline-none"
              title="Acessar configurações"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </>
      )}

      <MediaPlayer isActive={mode === 'media'} playlist={config.mediaPlaylist || []} groupId={config.selectedGroupId} />
      <ConsultationScreen isActive={mode === 'consultation'} onTimeout={switchToMedia} barcode={scannedBarcode} layout={config.activeLayout} />
      <ConfigScreen isActive={mode === 'config'} onConfigSave={handleConfigSave} onCancel={switchToMedia} />

      {/* Dialog de autenticação para configurações */}
      <Dialog open={isConfigAuthOpen} onOpenChange={setIsConfigAuthOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso às Configurações</DialogTitle>
            <DialogDescription>
              Digite o código de acesso para continuar
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="configCode">Código de Acesso</Label>
            <Input
              id="configCode"
              type="password"
              value={configAuthCode}
              onChange={(e) => setConfigAuthCode(e.target.value)}
              className="mt-2"
              autoFocus
            />
            {configAuthError && (
              <p className="text-red-500 text-sm mt-2">{configAuthError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigAuthOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfigAuth}>
              Acessar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Indicador de atualização */}
      {isUpdating && (
        <div className="fixed bottom-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Sincronizando conteúdo...</span>
        </div>
      )}
    </div>
  );
};

export default KioskApp;
