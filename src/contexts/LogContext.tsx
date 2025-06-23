import React, { createContext, useContext, useEffect } from 'react';
import { useSystemLogs, SystemLog } from '@/hooks/useSystemLogs';

interface LogContextType {
  logs: SystemLog[];
  addLog: (message: string, type?: SystemLog['type'], details?: any) => void;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: React.ReactNode }) {
  const logSystem = useSystemLogs();

  // Adiciona um log inicial quando o sistema é iniciado
  useEffect(() => {
    logSystem.addLog('Sistema iniciado', 'info', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  }, []);

  // Loga erros não tratados
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logSystem.addLog('Erro não tratado', 'error', {
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logSystem.addLog('Promessa rejeitada não tratada', 'error', {
        reason: event.reason,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [logSystem]);

  return (
    <LogContext.Provider value={logSystem}>
      {children}
    </LogContext.Provider>
  );
}

export function useLog() {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLog deve ser usado dentro de um LogProvider');
  }
  return context;
} 