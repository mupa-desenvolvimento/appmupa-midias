# 📦 Sistema de Cache de Mídias - Mupa Digital Kiosk

## 🎯 **Visão Geral**

Sistema completo de cache local para otimizar a performance de mídias (imagens, vídeos e áudios) em dispositivos Android WebView. Implementa múltiplas estratégias de cache para garantir funcionamento offline e reduzir dependência de rede.

---

## 🏗️ **Arquitetura do Sistema**

### **1. Camadas de Cache**

```
┌─────────────────────────────────────────┐
│           APLICAÇÃO REACT               │
├─────────────────────────────────────────┤
│     🎣 Hooks (useMediaCache)           │
├─────────────────────────────────────────┤
│  📦 MediaCacheService (IndexedDB)      │
├─────────────────────────────────────────┤
│     🔧 Service Worker (Cache API)       │
├─────────────────────────────────────────┤
│        🌐 NAVEGADOR / WEBVIEW           │
└─────────────────────────────────────────┘
```

### **2. Tecnologias Utilizadas**

- **IndexedDB**: Armazenamento principal de metadados e Blob URLs
- **Cache API**: Cache nativo do navegador via Service Worker  
- **Blob URLs**: URLs locais para mídias cacheadas
- **React Hooks**: Interface reativa para componentes

---

## 🚀 **Implementação**

### **Serviço Principal**

```typescript
// src/lib/services/MediaCacheService.ts
import { mediaCacheService } from '../lib/services/MediaCacheService';

// Cachear uma mídia
const cachedUrl = await mediaCacheService.cacheMedia(originalUrl, 'image');

// Obter URL otimizada (cache first)
const optimizedUrl = await mediaCacheService.getOptimizedUrl(originalUrl, 'image');
```

### **Hook React**

```typescript
// Usar em componentes
import { useMediaCache } from '../hooks/useMediaCache';

const MyComponent = () => {
  const { cachedUrl, isLoading, error, isOnline } = useMediaCache(imageUrl, 'image');
  
  return (
    <img 
      src={cachedUrl || imageUrl} 
      style={{ opacity: isLoading ? 0.7 : 1 }}
    />
  );
};
```

### **Múltiplas Mídias**

```typescript
import { useMultipleMediaCache } from '../hooks/useMediaCache';

const mediaList = [
  { url: 'image1.jpg', type: 'image' },
  { url: 'video1.mp4', type: 'video' }
];

const { cachedMedias, isLoading, progress } = useMultipleMediaCache(mediaList);
```

---

## ⚙️ **Configurações**

### **Limites e Expiração**

```typescript
// MediaCacheService.ts
private maxCacheSize = 500 * 1024 * 1024; // 500MB
private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
```

### **Service Worker**

```javascript
// public/sw.js
const CACHE_NAME = 'mupa-media-cache-v1';
const MEDIA_CACHE_NAME = 'mupa-media-files-v1';

// Padrões de URLs para cache automático
const MEDIA_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg)$/i,
  /\.(mp4|webm|ogg|avi)$/i,
  /\.(mp3|wav|ogg|aac)$/i,
  /\/api\/produto\/.*\/imagem/i
];
```

---

## 🎮 **Gerenciador de Cache**

### **Interface Gráfica**

Acesse via **Configurações → Avançado → Cache de Mídias**

**Funcionalidades:**
- 📊 Estatísticas em tempo real
- 🧹 Limpeza inteligente (apenas expirados)
- 🗑️ Limpeza completa
- 🚀 Pré-carregamento de mídias populares
- 📱 Status online/offline

### **Programático**

```typescript
import { mediaCacheService } from '../lib/services/MediaCacheService';

// Estatísticas
const stats = await mediaCacheService.getCacheStats();
console.log(`${stats.itemCount} itens, ${formatBytes(stats.totalSize)}`);

// Limpeza
await mediaCacheService.cleanup(); // Inteligente
await mediaCacheService.clearAll(); // Completa

// Pré-carregamento
const urls = ['image1.jpg', 'image2.jpg'];
await mediaCacheService.preloadMedias(urls, 'image');
```

---

## 🔄 **Estratégias de Cache**

### **1. Cache First (Mídias)**
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Request │───▶│  Cache  │───▶│ Network │
└─────────┘    └─────────┘    └─────────┘
                    │              │
                    ▼              ▼
                ┌─────────┐    ┌─────────┐
                │ Return  │    │  Cache  │
                └─────────┘    └─────────┘
```

### **2. Network First (Outros)**
```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Request │───▶│ Network │───▶│  Cache  │
└─────────┘    └─────────┘    └─────────┘
                    │              │
                    ▼              ▼
                ┌─────────┐    ┌─────────┐
                │  Cache  │    │ Return  │
                └─────────┘    └─────────┘
```

---

## 📱 **Otimizações para Android WebView**

### **Detecção de Plataforma**
```typescript
// Detectar Android WebView
const isAndroidWebView = /Android.*wv\)/.test(navigator.userAgent);

// Ajustar configurações
const cacheConfig = {
  maxSize: isAndroidWebView ? 300 * 1024 * 1024 : 500 * 1024 * 1024,
  compressionLevel: isAndroidWebView ? 0.8 : 0.9
};
```

### **Gerenciamento de Memória**
```typescript
// Limpeza automática quando cache excede limite
private async cleanupIfNeeded(): Promise<void> {
  const stats = await this.getCacheStats();
  
  if (stats.totalSize > this.maxCacheSize) {
    await this.cleanup();
  }
}

// Revogar Blob URLs para liberar memória
URL.revokeObjectURL(cachedMedia.localUrl);
```

---

## 🔍 **Monitoramento e Debug**

### **Logs Detalhados**
```
🔧 Service Worker: Instalando...
📦 IndexedDB inicializado para cache de mídia
📥 Iniciando cache de image: https://example.com/image.jpg
✅ image cacheado com sucesso: blob:http://localhost:8080/uuid
🧹 Cache excedeu limite, iniciando limpeza...
```

### **Indicadores Visuais**
- 🔄 Spinner durante carregamento
- 🔴 Status offline
- ⚠️ Avisos de erro
- 📊 Progresso de pré-carregamento

### **Console Commands**
```javascript
// No DevTools Console
mediaCacheService.getCacheStats().then(console.log);
mediaCacheService.clearAll();
```

---

## 🎯 **Casos de Uso**

### **1. ProductLayout1.tsx**
```typescript
// Cache automático da imagem do produto
const { cachedUrl, isLoading, isOnline } = useMediaCache(imageUrl, 'image');

return (
  <img 
    src={cachedUrl || imageUrl}
    onLoad={() => console.log('✅ Imagem carregada')}
    style={{ opacity: isLoading ? 0.7 : 1 }}
  />
);
```

### **2. MediaPlayer.tsx**
```typescript
// Cache de vídeos e imagens da playlist
const { cachedUrl } = useMediaCache(
  currentMedia?.url, 
  currentMedia?.type === 'video' ? 'video' : 'image'
);

return (
  <video src={cachedUrl || currentMedia.url} autoPlay />
);
```

### **3. Pré-carregamento Inteligente**
```typescript
// Hook para pré-carregar mídias populares quando idle
const { preloadPopularMedias, isPreloading } = usePreloadMedias({
  enabled: true,
  maxItems: 20,
  preloadOnIdle: true // 30s de inatividade
});
```

---

## 📊 **Métricas de Performance**

### **Benefícios Esperados**
- ⚡ **50-80%** redução no tempo de carregamento
- 📱 **Funcionamento offline** completo
- 🔋 **Menor uso de dados** móveis
- 🚀 **UX mais fluida** em Android WebView

### **Monitoramento**
```typescript
// Métricas automáticas
const stats = await mediaCacheService.getCacheStats();
console.log({
  cacheHitRate: stats.hits / (stats.hits + stats.misses),
  averageLoadTime: stats.totalLoadTime / stats.requests,
  offlineCapability: stats.itemCount > 0
});
```

---

## 🛠️ **Manutenção**

### **Limpeza Automática**
- ✅ Itens expirados (7 dias)
- ✅ Cache excedendo limite (500MB)
- ✅ Arquivos corrompidos
- ✅ URLs inválidas

### **Atualizações**
```typescript
// Forçar atualização de mídia específica
await mediaCacheService.removeCachedMedia(oldUrl);
const newCachedUrl = await mediaCacheService.cacheMedia(newUrl, 'image');
```

### **Backup/Restore**
```typescript
// Exportar configurações de cache
const cacheData = await mediaCacheService.exportCache();

// Importar configurações
await mediaCacheService.importCache(cacheData);
```

---

## 🚨 **Troubleshooting**

### **Problemas Comuns**

**1. Cache não funciona**
```bash
# Verificar Service Worker
chrome://inspect/#service-workers

# Verificar IndexedDB
chrome://settings/content/all → localhost → IndexedDB
```

**2. Memória insuficiente**
```typescript
// Reduzir limite do cache
private maxCacheSize = 200 * 1024 * 1024; // 200MB
```

**3. URLs não são cacheadas**
```typescript
// Verificar padrões no Service Worker
const MEDIA_PATTERNS = [
  /sua-api\/produtos\/.*\/imagem/i
];
```

---

## 📋 **Checklist de Implementação**

- ✅ MediaCacheService implementado
- ✅ Hooks React criados  
- ✅ Service Worker configurado
- ✅ Componentes integrados
- ✅ Gerenciador de cache funcional
- ✅ Pré-carregamento automático
- ✅ Monitoramento e logs
- ✅ Limpeza automática
- ✅ Documentação completa

---

## 🔗 **Arquivos Relacionados**

```
src/
├── lib/services/MediaCacheService.ts
├── hooks/useMediaCache.ts
├── hooks/usePreloadMedias.ts
├── components/CacheManager.tsx
├── components/ProductLayout1.tsx
├── components/MediaPlayer.tsx
└── main.tsx

public/
└── sw.js
```

---

**🎉 Sistema de Cache implementado com sucesso!**

Para dúvidas ou melhorias, consulte os logs do console ou acesse o Gerenciador de Cache na interface. 