
import { useState, useEffect } from 'react';
import { AppMode } from '../types';

export const useAppMode = () => {
  const [mode, setMode] = useState<AppMode>('media');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const switchToConsultation = () => {
    setMode('consultation');
    resetTimeout();
  };

  const switchToMedia = () => {
    setMode('media');
    clearCurrentTimeout();
  };

  const switchToConfig = () => {
    setMode('config');
    clearCurrentTimeout();
  };

  const resetTimeout = () => {
    clearCurrentTimeout();
    const id = setTimeout(() => {
      switchToMedia();
    }, 30000); // 30 seconds
    setTimeoutId(id);
  };

  const clearCurrentTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  useEffect(() => {
    return () => {
      clearCurrentTimeout();
    };
  }, []);

  return {
    mode,
    switchToConsultation,
    switchToMedia,
    switchToConfig,
    resetTimeout
  };
};
