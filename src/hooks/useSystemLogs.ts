import { useEffect, useState, useCallback } from 'react';

export interface SystemLog {
  timestamp: number;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  details?: any;
}

const MAX_LOGS = 1000; // Limite máximo de logs armazenados
const STORAGE_KEY = 'system_logs';

export const useSystemLogs = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Carregar logs do localStorage
  const loadLogs = useCallback(() => {
    try {
      const savedLogs = localStorage.getItem(STORAGE_KEY);
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        console.log('Logs carregados:', parsedLogs.length);
        setLogs(parsedLogs);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setLogs([]);
    }
  }, []);

  // Salvar logs no localStorage
  const saveLogs = useCallback((newLogs: SystemLog[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
      console.log('Logs salvos:', newLogs.length);
    } catch (error) {
      console.error('Erro ao salvar logs:', error);
    }
  }, []);

  // Carregar logs ao iniciar
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const addLog = useCallback((
    message: string,
    type: SystemLog['type'] = 'info',
    details?: any
  ) => {
    const newLog: SystemLog = {
      timestamp: Date.now(),
      message,
      type,
      details,
    };

    setLogs((currentLogs) => {
      const updatedLogs = [newLog, ...currentLogs].slice(0, MAX_LOGS);
      saveLogs(updatedLogs);
      return updatedLogs;
    });

    // Log no console para debug
    console.log(`[${type.toUpperCase()}] ${message}`, details);
  }, [saveLogs]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY);
    console.log('Logs limpos');
  }, []);

  return {
    logs,
    addLog,
    clearLogs,
  };
}; 