import { useState, useEffect } from 'react';

export interface Device {
  id: number;
  serial: string;
  status: 'online' | 'offline';
  apelido: string;
  empresa: string;
  coduser: string;
}

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dispositivos');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar dispositivos');
      }

      setDevices(data.dispositivos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dispositivos');
      console.error('Erro ao carregar dispositivos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return {
    devices,
    loading,
    error,
    refetch: fetchDevices
  };
} 