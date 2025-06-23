import { useState, useEffect } from 'react';

// Hook para persistir estado no localStorage
function getStorageValue<T>(key: string, defaultValue: T): T {
  // Garante que o código só rode no navegador
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Erro ao parsear o JSON do localStorage:', error);
        return defaultValue;
      }
    }
  }
  return defaultValue;
}

export const useLocalStorage = <T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
  const [value, setValue] = useState<T>(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    // Salva o valor no localStorage sempre que ele mudar
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }, [key, value]);

  return [value, setValue];
}; 