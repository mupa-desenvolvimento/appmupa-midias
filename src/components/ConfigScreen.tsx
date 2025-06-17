
import { useState } from 'react';
import { AppConfig } from '../types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Settings, Wifi } from 'lucide-react';

interface ConfigScreenProps {
  isActive: boolean;
  onConfigSave: (config: AppConfig) => void;
}

const ConfigScreen = ({ isActive, onConfigSave }: ConfigScreenProps) => {
  const [config, setConfig] = useState<AppConfig>({
    deviceId: '',
    apiUrl: '',
    activeLayout: 1,
    timeoutDuration: 30000,
    syncInterval: 300000
  });

  const handleSave = () => {
    onConfigSave(config);
  };

  const simulateQRScan = () => {
    // Simulate QR code configuration
    setConfig({
      deviceId: 'TERMINAL-001',
      apiUrl: 'https://api.mupa.com.br',
      activeLayout: 1,
      timeoutDuration: 30000,
      syncInterval: 300000
    });
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <Settings className="w-12 h-12 mx-auto text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Configuração do Terminal
          </h2>
          <p className="text-gray-600">
            Configure o dispositivo para conectar à plataforma Mupa
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={simulateQRScan}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Escanear QR Code de Configuração
          </Button>

          <div className="space-y-3">
            <div>
              <Label htmlFor="deviceId">ID do Dispositivo</Label>
              <Input
                id="deviceId"
                value={config.deviceId}
                onChange={(e) => setConfig(prev => ({ ...prev, deviceId: e.target.value }))}
                placeholder="Ex: TERMINAL-001"
              />
            </div>

            <div>
              <Label htmlFor="apiUrl">URL da API</Label>
              <Input
                id="apiUrl"
                value={config.apiUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                placeholder="Ex: https://api.mupa.com.br"
              />
            </div>

            <div>
              <Label htmlFor="layout">Layout Ativo (1-5)</Label>
              <Input
                id="layout"
                type="number"
                min="1"
                max="5"
                value={config.activeLayout}
                onChange={(e) => setConfig(prev => ({ ...prev, activeLayout: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!config.deviceId || !config.apiUrl}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
          >
            <Wifi className="w-5 h-5 mr-2" />
            Salvar Configuração
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConfigScreen;
