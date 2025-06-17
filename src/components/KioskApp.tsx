
import { useEffect, useState } from 'react';
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

  const handleConfigSave = (newConfig: AppConfig) => {
    setConfig(newConfig);
    switchToMedia();
  };

  // Show config screen if not configured
  if (!config) {
    return <ConfigScreen isActive={true} onConfigSave={handleConfigSave} />;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
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

      {/* Floating Action Buttons - only show in media mode */}
      {mode === 'media' && (
        <div className="fixed bottom-8 right-8 flex flex-col space-y-4 z-50">
          <Button
            onClick={switchToConsultation}
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white shadow-2xl px-8 py-6 text-xl rounded-2xl border-2 border-green-500"
          >
            <Search className="w-8 h-8 mr-3" />
            Consultar Preço
          </Button>
          
          <Button
            onClick={switchToConfig}
            size="sm"
            variant="secondary"
            className="bg-gray-600 hover:bg-gray-700 text-white shadow-xl rounded-full p-4"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default KioskApp;
