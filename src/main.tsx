import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Registrar Service Worker para cache de mídias
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registrado:', registration.scope);
      
      // Escutar atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nova versão do Service Worker disponível');
            }
          });
        }
      });
    } catch (error) {
      console.warn('⚠️ Falha ao registrar Service Worker:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
