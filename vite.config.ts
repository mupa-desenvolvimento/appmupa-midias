import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const DEFAULT_CONFIG = {
  apiHost: '192.168.1.4',
  apiPort: 5000,
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Usar configuração padrão (Vite não tem acesso ao localStorage durante build)
  const apiUrl = `http://${DEFAULT_CONFIG.apiHost}:${DEFAULT_CONFIG.apiPort}`;
  console.log('🔗 Vite Proxy Target:', apiUrl);

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api'),
          secure: false,
          ws: true,
          timeout: 10000, // 10 segundos de timeout
          configure: (proxy, _options) => {
            proxy.on('error', (err, req, res) => {
              console.error('🚨 Proxy Error:', err.message);
              console.error('🔗 Target URL:', apiUrl);
              console.error('📡 Request:', req.method, req.url);
              
              // Em caso de erro de proxy, tentar responder com headers CORS
              if (res && !res.headersSent) {
                try {
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                  res.statusCode = 503;
                  res.end(JSON.stringify({ 
                    error: 'Proxy Error', 
                    message: 'Não foi possível conectar ao servidor backend',
                    target: apiUrl 
                  }));
                } catch (e) {
                  console.error('Erro ao enviar resposta de erro:', e);
                }
              }
            });
            
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 Proxy Request:', req.method, req.url, '→', apiUrl + req.url);
              
              // Adicionar headers necessários na requisição
              proxyReq.setHeader('Origin', apiUrl);
              proxyReq.setHeader('User-Agent', 'Mupa-Kiosk-Proxy/1.0');
              
              // Garantir Content-Type para POST/PUT
              if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
                if (!proxyReq.getHeader('Content-Type')) {
                  proxyReq.setHeader('Content-Type', 'application/json');
                }
              }
            });
            
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('📥 Proxy Response:', proxyRes.statusCode, req.url);
              
              // Sempre adicionar headers CORS na resposta
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
              res.setHeader('Access-Control-Allow-Credentials', 'true');
              res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight por 24h
              
              // Log de resposta para debug
              if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
                console.warn('⚠️ API Error Response:', proxyRes.statusCode, req.url);
              }
            });
          },
        },
        '/produto-imagem': {
          target: 'http://srv-mupa.ddns.net:5050',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/produto-imagem/, '/produto-imagem'),
          secure: false,
        },
        '/mupa-api': {
          target: 'https://mupa.app/api',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mupa-api/, ''),
          secure: true,
        }
      },
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
