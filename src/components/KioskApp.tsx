
import { useEffect } from 'react';
import { useAppMode } from '../hooks/useAppMode';
import { AppConfig } from '../types';
import MediaPlayer from './MediaPlayer';
import ConsultationScreen from './ConsultationScreen';
import ConfigScreen from './ConfigScreen';
import { Button } from '@/components/ui/button';
import { Settings, Search } from 'lucide-react';

const KioskApp = () => {
  const { mode, switchToConsultation, switchToMedia, switchToConfig, resetTimeout } = useAppMode();
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    // Prevent context menu and selection
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('selectstart', e => e.preventDefault());
    
    // Full screen mode
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(console.log);
    }

    return () => {
      document.removeEventListener('contextmenu', e => e.preventDefault());
      document.removeEventListener('selectstart', e => e.preventDefault());
    };
  }, []);

  const handleConfigSave = (newConfig: AppConfig) => {
    setConfig(newConfig);
    switchToMedia();
  };

  // Show config screen if not configured
  if (!config) {
    return <ConfigScreen isActive={true} onConfigSave={handleConfigSave} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
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

      {/* Floating Action Buttons */}
      {mode === 'media' && (
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
          <Button
            onClick={switchToConsultation}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg px-6 py-4 text-lg rounded-full"
          >
            <Search className="w-6 h-6 mr-2" />
            Consultar Preço
          </Button>
          
          <Button
            onClick={switchToConfig}
            size="sm"
            variant="secondary"
            className="bg-gray-600 hover:bg-gray-700 text-white shadow-lg rounded-full p-3"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Status Bar */}
      <div className="fixed top-0 left-0 right-0 bg-black/50 text-white p-2 text-center text-sm z-50">
        Terminal: {config.deviceId} | Modo: {mode.toUpperCase()} | Status: Online
      </div>
    </div>
  );
};

export default KioskApp;
