import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook customizado para detectar inatividade do usuário.
 * @param onIdle - Função a ser executada quando o usuário ficar inativo.
 * @param timeout - Tempo em milissegundos para considerar o usuário inativo.
 * @param isActive - Booleano para ativar ou desativar o timer.
 */
export const useIdleTimer = (onIdle: () => void, timeout: number, isActive: boolean) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função que reinicia o timer
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(onIdle, timeout);
  }, [onIdle, timeout]);

  // Handler para qualquer atividade do usuário
  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Se o timer não estiver ativo, limpa tudo e sai
    if (!isActive) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Eventos que contam como atividade
    const events = ['mousemove', 'mousedown', 'keypress', 'touchmove', 'touchstart', 'scroll'];
    
    // Adiciona os listeners para os eventos de atividade
    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // Inicia o timer
    resetTimer();

    // Função de limpeza para remover os listeners
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [isActive, handleActivity, resetTimer]);
}; 