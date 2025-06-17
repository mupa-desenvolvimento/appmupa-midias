import { useEffect, useState, useRef } from 'react';
import { useAppMode } from '../hooks/useAppMode';
import { AppConfig } from '../types';
import MediaPlayer from './MediaPlayer';
import ConsultationScreen from './ConsultationScreen';
import ConfigScreen from './ConfigScreen';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const KioskApp = () => {
  const { mode, switchToConsultation, switchToMedia, switchToConfig } = useAppMode();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Prevent context menu and selection
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    
    // Remove scrollbars and ensure full screen
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Try to enter fullscreen mode
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(console.log);
    }

    return () => {
      document.removeEventListener('contextmenu', e => e.preventDefault());
      document.removeEventListener('selectstart', e => e.preventDefault());
    };
  }, []);

  useEffect(() => {
    // Always keep focus on input for barcode scanning
    if (mode === 'media' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleConfigSave = (newConfig: AppConfig) => {
    setConfig(newConfig);
    switchToMedia();
  };

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length >= 8) {
      switchToConsultation();
      e.target.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value;
      if (value.length >= 8) {
        switchToConsultation();
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  // Show config screen if not configured
  if (!config) {
    return <ConfigScreen isActive={true} onConfigSave={handleConfigSave} />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      {/* Input invisível para leitura de código de barras */}
      <input
        ref={inputRef}
        type="text"
        onChange={handleBarcodeInput}
        onKeyDown={handleKeyDown}
        className="absolute -left-full opacity-0 pointer-events-none"
        autoFocus
        tabIndex={0}
      />

      {/* Media Player */}
      <MediaPlayer isActive={mode === 'media'} />

      {/* Consultation Screen */}
      <ConsultationScreen 
        isActive={mode === 'consultation'} 
        onTimeout={switchToMedia}
        layout={config.activeLayout}
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
            onClick={switchToConfig}
            size="sm"
            variant="secondary"
            className="bg-black/20 hover:bg-black/40 text-white shadow-xl rounded-full p-3 opacity-20 hover:opacity-100 transition-opacity"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default KioskApp;
