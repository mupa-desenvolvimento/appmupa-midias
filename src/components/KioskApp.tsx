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
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isConfigScreen, setIsConfigScreen] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState('');

  // Foca o input após interação do usuário
  useEffect(() => {
    if (!isConfigScreen && hasUserInteracted && inputRef.current) {
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
    if (mode === 'config') {
      setIsConfigScreen(true);
    } else {
      setIsConfigScreen(false);
    }
  }, [mode]);

  const handleConfigSave = (newConfig: AppConfig) => {
    setConfig(newConfig);
    console.log('Config salva:', newConfig); // Debug
    switchToMedia();
  };

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeValue(e.target.value);
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value;
      if (value.length >= 4) {
        setScannedBarcode(value);
        switchToConsultation();
        setBarcodeValue(''); // Limpa o input
      }
    }
  };

  // Foco automático sempre que não estiver na tela de configuração
  useEffect(() => {
    if (!isConfigScreen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isConfigScreen, mode]);

  // Show config screen if not configured
  if (!config) {
    return <ConfigScreen isActive={true} onConfigSave={handleConfigSave} />;
  }

  console.log('Layout ativo:', config.activeLayout); // Debug

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
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
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* Media Player */}
      <MediaPlayer 
        isActive={mode === 'media'}
        mediaId="1700411533483x832110738923847700"
        token="9c264e50ddb95a215b446412a3b42b58"
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
