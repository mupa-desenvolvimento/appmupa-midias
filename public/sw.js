// Service Worker para Cache de Mídias - Mupa Digital Kiosk
const CACHE_NAME = 'mupa-media-cache-v1';
const MEDIA_CACHE_NAME = 'mupa-media-files-v1';

// URLs que devem ser sempre cacheadas
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Padrões de URLs de mídia para cache
const MEDIA_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg)$/i,
  /\.(mp4|webm|ogg|avi)$/i,
  /\.(mp3|wav|ogg|aac)$/i,
  /\/api\/produto\/.*\/imagem/i,
  /\/api\/media\//i
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Cache estático criado');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Instalação concluída');
        self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erro na instalação:', error);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Limpar caches antigos
          if (cacheName !== CACHE_NAME && cacheName !== MEDIA_CACHE_NAME) {
            console.log('🗑️ Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Ativação concluída');
      return self.clients.claim();
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Apenas para requisições GET
  if (request.method !== 'GET') {
    return;
  }

  // Verificar se é mídia
  const isMedia = MEDIA_PATTERNS.some(pattern => pattern.test(url.pathname + url.search));
  
  if (isMedia) {
    // Estratégia Cache First para mídias
    event.respondWith(handleMediaRequest(request));
  } else {
    // Estratégia Network First para outros recursos
    event.respondWith(handleNetworkRequest(request));
  }
});

// Gerenciar requisições de mídia (Cache First)
async function handleMediaRequest(request) {
  try {
    console.log('🎬 Service Worker: Buscando mídia no cache:', request.url);
    
    // Tentar buscar no cache primeiro
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('✅ Service Worker: Mídia encontrada no cache');
      return cachedResponse;
    }

    console.log('📥 Service Worker: Baixando mídia da rede...');
    
    // Se não estiver no cache, buscar na rede
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cachear apenas respostas válidas
      const cache = await caches.open(MEDIA_CACHE_NAME);
      
      // Verificar tamanho do arquivo (limitar cache para arquivos grandes)
      const contentLength = networkResponse.headers.get('content-length');
      const fileSizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0;
      
      if (fileSizeMB < 50) { // Apenas arquivos menores que 50MB
        console.log(`💾 Service Worker: Cacheando mídia (${fileSizeMB.toFixed(1)}MB)`);
        cache.put(request, networkResponse.clone());
      } else {
        console.log(`⚠️ Service Worker: Arquivo muito grande para cache (${fileSizeMB.toFixed(1)}MB)`);
      }
    }

    return networkResponse;
  } catch (error) {
    console.error('❌ Service Worker: Erro ao buscar mídia:', error);
    
    // Tentar retornar do cache como fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('🔄 Service Worker: Usando cache como fallback');
      return cachedResponse;
    }
    
    // Se não há cache, retornar erro
    return new Response('Mídia não disponível offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Gerenciar outras requisições (Network First)
async function handleNetworkRequest(request) {
  try {
    // Tentar rede primeiro
    const networkResponse = await fetch(request);
    
    // Se a resposta for válida, cachear
    if (networkResponse.ok && request.url.startsWith(self.location.origin)) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🔄 Service Worker: Rede indisponível, tentando cache...');
    
    // Se a rede falhar, tentar cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se não há cache, retornar erro
    return new Response('Recurso não disponível offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Limpar cache quando necessário
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('🗑️ Service Worker: Limpando cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ Service Worker: Todos os caches limpos');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

// Calcular tamanho do cache
async function getCacheSize() {
  let totalSize = 0;
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

console.log('🎯 Service Worker carregado para Mupa Digital Kiosk'); 