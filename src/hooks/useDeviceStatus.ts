import { useState, useCallback } from 'react';

export function useDeviceStatus(serial: string) {
  const [status, setStatus] = useState<'online' | 'offline'>('offline');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(async (newStatus: 'online' | 'offline') => {
    try {
      const response = await fetch(`/api/dispositivos/${serial}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      setStatus(newStatus);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
      console.error('Erro ao atualizar status:', err);
    }
  }, [serial]);

  return {
    status,
    lastUpdate,
    error,
    updateStatus,
  };
} 