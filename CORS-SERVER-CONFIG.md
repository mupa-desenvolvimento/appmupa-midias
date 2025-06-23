# 🔧 Configuração de CORS no Servidor Backend

## 📋 Problema Identificado

O sistema de kiosk está enfrentando problemas de CORS (Cross-Origin Resource Sharing) quando tenta acessar a API em `http://192.168.1.10:5000` a partir do frontend em `http://192.168.1.10:8080`.

**Erro típico:**
```
Access to fetch at 'http://192.168.1.10:5000/api/status' from origin 'http://192.168.1.10:8080' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## 🎯 Soluções Implementadas

### 1. **Frontend (Já Implementado)**
- ✅ Proxy configurado no Vite para desenvolvimento
- ✅ Detecção inteligente de erros CORS
- ✅ Fallback para requisições diretas quando necessário

### 2. **Backend (Precisa Implementar)**

## 🚀 Configuração CORS no Servidor

### **Para Express.js/Node.js:**

#### Instalação do middleware CORS:
```bash
npm install cors
# ou
yarn add cors
```

#### Configuração básica:
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Configuração CORS para permitir todas as origens (desenvolvimento)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Suas rotas da API
app.get('/api/status', (req, res) => {
  res.json({ status: 'success', message: 'API está funcionando corretamente' });
});

app.listen(5000, () => {
  console.log('Servidor rodando na porta 5000 com CORS configurado');
});
```

#### Configuração específica para produção:
```javascript
const corsOptions = {
  origin: [
    'http://192.168.1.10:8080',    // Frontend desenvolvimento
    'http://localhost:8080',       // Frontend local
    'http://192.168.1.10',         // IP sem porta
    // Adicione outros IPs/domínios conforme necessário
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200 // Para suporte a navegadores legados
};

app.use(cors(corsOptions));
```

### **Para Python/Flask:**

#### Instalação:
```bash
pip install flask-cors
```

#### Configuração:
```python
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Configuração CORS
CORS(app, origins=[
    "http://192.168.1.10:8080",
    "http://localhost:8080"
], supports_credentials=True)

@app.route('/api/status')
def status():
    return jsonify({
        'status': 'success',
        'message': 'API está funcionando corretamente'
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### **Para Python/FastAPI:**

#### Instalação:
```bash
pip install fastapi uvicorn
```

#### Configuração:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://192.168.1.10:8080",
        "http://localhost:8080",
        "*"  # Para desenvolvimento - remover em produção
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
async def status():
    return {
        "status": "success", 
        "message": "API está funcionando corretamente"
    }
```

### **Configuração Manual (Qualquer Framework):**

Se não puder usar middleware, adicione headers manualmente:

```javascript
// Em cada resposta da API
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.setHeader('Access-Control-Allow-Credentials', 'true');

// Para requisições OPTIONS (preflight)
if (req.method === 'OPTIONS') {
  res.status(200).end();
  return;
}
```

## 🔍 Teste de Verificação

Após implementar CORS no servidor, teste:

1. **Teste direto no navegador:**
   ```
   http://192.168.1.10:5000/api/status
   ```

2. **Teste via console do navegador:**
   ```javascript
   fetch('http://192.168.1.10:5000/api/status')
     .then(response => response.json())
     .then(data => console.log('✅ CORS funcionando:', data))
     .catch(error => console.error('❌ CORS ainda com problema:', error));
   ```

3. **No sistema de kiosk:**
   - Acesse a tela de configuração
   - Clique em "Testar Conexão"
   - Deve mostrar "✅ Conexão OK" sem avisos de CORS

## 🛡️ Segurança em Produção

Para produção, **NUNCA** use `origin: '*'`. Configure origens específicas:

```javascript
const corsOptions = {
  origin: [
    'http://192.168.1.10:8080',     // Kiosk
    'http://192.168.1.11:8080',     // Outro kiosk
    'https://admin.mupa.app',       // Painel admin
  ],
  credentials: true
};
```

## 📋 Checklist de Implementação

- [ ] Instalar middleware CORS no servidor
- [ ] Configurar origens permitidas
- [ ] Adicionar headers necessários
- [ ] Testar requisições OPTIONS (preflight)
- [ ] Verificar funcionamento no kiosk
- [ ] Configurar segurança para produção
- [ ] Documentar configuração para equipe

## 🆘 Troubleshooting

### Problema: Ainda recebo erro de CORS
**Solução:** Verifique se:
- O servidor foi reiniciado após a configuração
- A porta está correta (5000)
- O IP está correto (192.168.1.10)
- Headers estão sendo enviados corretamente

### Problema: Funciona no navegador mas não no kiosk
**Solução:** 
- Limpe o cache do navegador
- Verifique se o proxy do Vite está funcionando
- Teste com DevTools aberto

### Problema: Funciona em desenvolvimento mas não em produção
**Solução:**
- Configure origens específicas (não use '*')
- Verifique certificados SSL se usando HTTPS
- Confirme configuração do servidor web (nginx/apache)

---

## 📞 Suporte

Se precisar de ajuda adicional, forneça:
1. Framework do servidor backend (Express, Flask, etc.)
2. Logs de erro completos
3. Configuração atual do CORS
4. Resultado do teste no navegador
5. Detalhes sobre o sistema de kiosk
6. Detalhes sobre o frontend
7. Detalhes sobre o servidor web (nginx/apache) 