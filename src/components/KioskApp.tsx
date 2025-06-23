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
    if (configAuthCode === 'mupa.2024') {
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
  
  if (!config.selectedGroupId) {
    return <ConfigScreen isActive={true} onConfigSave={handleConfigSave} onCancel={switchToMedia} />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black transition-all duration-300 ease-in-out">
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
      <MediaPlayer isActive={mode === 'media'} playlist={config.mediaPlaylist || []} groupId={config.selectedGroupId} />
      <ConsultationScreen isActive={mode === 'consultation'} onTimeout={switchToMedia} barcode={scannedBarcode} layout={config.activeLayout} />
      <ConfigScreen isActive={mode === 'config'} onConfigSave={handleConfigSave} onCancel={switchToMedia} />
      <Dialog open={isConfigAuthOpen} onOpenChange={setIsConfigAuthOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0A0A0A] border-[#27272A] text-white">
          <DialogHeader><DialogTitle className="text-white">Acesso Restrito</DialogTitle><DialogDescription className="text-gray-400">Para acessar as configurações, por favor, insira o código do usuário.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="config-code" className="text-right text-gray-300">Código</Label>
              <Input id="config-code" type="password" value={configAuthCode} onChange={(e) => setConfigAuthCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConfigAuth()} className="col-span-3 bg-[#18181B] border-[#27272A] text-white" autoFocus />
            </div>
            {configAuthError && (<p className="text-red-500 text-sm col-span-4 text-center">{configAuthError}</p>)}
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

export default KioskApp;
