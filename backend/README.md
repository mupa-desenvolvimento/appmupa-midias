# Backend de Sincronização de Mídias

Servidor backend para sincronização automática e consulta de mídias da API Bubble.

## 🚀 Funcionalidades

- ✅ Sincronização automática a cada 1 hora
- ✅ Armazenamento local em SQLite
- ✅ Filtros por grupo, data/hora e dias da semana
- ✅ Cache inteligente (1 hora)
- ✅ Sincronização manual via API
- ✅ Logs detalhados de operações
- ✅ Tratamento de erros robusto

## 📋 Pré-requisitos

- Node.js 14+ 
- npm ou yarn

## 🛠️ Instalação

1. **Navegue para a pasta do backend:**
```bash
cd backend
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Inicie o servidor:**
```bash
npm start
```

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

## 🌐 Endpoints da API

### 1. Obter Mídias por Grupo
```
GET /midias/:grupo_lojas
```

**Parâmetros:**
- `grupo_lojas` (path): ID do grupo de dispositivos
- `dia` (query, opcional): Dia da semana para simular (ex: "Segunda", "Terça")
- `timestamp_atual` (query, opcional): Timestamp para simular data/hora

**Exemplo:**
```bash
curl http://localhost:3000/midias/123456789
curl "http://localhost:3000/midias/123456789?dia=Segunda&timestamp_atual=2024-01-15T10:00:00Z"
```

**Resposta:**
```json
{
  "success": true,
  "grupo_lojas": "123456789",
  "total": 5,
  "ultima_sincronizacao": "2024-01-15T09:00:00.000Z",
  "medias": [
    {
      "id": "E1SC",
      "nome": "E1SC.jpg",
      "link": "https://example.com/image.jpg",
      "tipo": "image",
      "ordem": 1.0,
      "volumeaudio": 80,
      "time": 10,
      "inicia": "2024-01-01T00:00:00Z",
      "final": "2024-12-31T23:59:59Z",
      "dias_da_semana": ["Segunda", "Terça", "Quarta"],
      "grupo_lojas": "123456789",
      "colecoes": "colecao123"
    }
  ]
}
```

### 2. Forçar Sincronização Manual
```
POST /sincronizar-midias
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/sincronizar-midias
```

### 3. Status do Servidor
```
GET /status
```

**Exemplo:**
```bash
curl http://localhost:3000/status
```

### 4. Estatísticas do Banco
```
GET /stats
```

**Exemplo:**
```bash
curl http://localhost:3000/stats
```

## 📊 Estrutura do Banco de Dados

### Tabela: `midias`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `_id` | TEXT | ID único do Bubble (PRIMARY KEY) |
| `id` | TEXT | Código curto da mídia |
| `nome` | TEXT | Nome do arquivo |
| `link` | TEXT | URL da mídia |
| `tipo` | TEXT | Tipo (image, video) |
| `ordem` | REAL | Ordem de exibição |
| `volumeaudio` | INTEGER | Volume (0-100) |
| `time` | INTEGER | Tempo de exibição (segundos) |
| `inicia` | TEXT | Data/hora de início |
| `final` | TEXT | Data/hora de fim |
| `range` | TEXT | Array JSON com range |
| `dias_da_semana` | TEXT | Array JSON com dias |
| `ativado` | INTEGER | Status ativo (0/1) |
| `grupo_lojas` | TEXT | ID do grupo |
| `colecoes` | TEXT | ID da coleção |
| `created_date` | TEXT | Data de criação |
| `modified_date` | TEXT | Data de modificação |
| `created_by` | TEXT | Criado por |
| `last_updated` | TEXT | Última atualização |

## ⚙️ Configuração

### Variáveis de Ambiente

- `PORT`: Porta do servidor (padrão: 3000)

### Configuração da API

As configurações da API estão no arquivo `server.js`:

```javascript
const API_CONFIG = {
  url: 'https://mupa.app/api/1.1/wf/get_medias_all',
  token: '9c264e50ddb95a215b446412a3b42b58',
  headers: {
    'Authorization': `Token 9c264e50ddb95a215b446412a3b42b58`,
    'Content-Type': 'application/json'
  }
};
```

## 🔄 Sincronização

### Automática
- Executa a cada hora (cron: `0 * * * *`)
- Verifica se há 1 hora desde a última sincronização
- Evita execuções simultâneas

### Manual
- Via endpoint `POST /sincronizar-midias`
- Útil para testes e atualizações imediatas

## 📝 Logs

O servidor gera logs detalhados incluindo:

- ✅ Início e fim de sincronizações
- 📊 Quantidade de mídias processadas
- ❌ Erros e exceções
- ⏰ Execuções agendadas
- 🔄 Status de cache

## 🛡️ Tratamento de Erros

- Timeout de 30 segundos para requisições
- Retry automático em caso de falhas
- Logs detalhados de erros
- Graceful shutdown

## 🚀 Deploy

### Local
```bash
npm start
```

### Produção
```bash
NODE_ENV=production npm start
```

### Docker (opcional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📞 Suporte

Para dúvidas ou problemas, verifique:

1. Logs do servidor
2. Status via `/status`
3. Estatísticas via `/stats`
4. Banco de dados SQLite (`midias.db`)

## 🔧 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com API:**
   - Verifique o token de autorização
   - Confirme se a URL está acessível

2. **Banco de dados não criado:**
   - Verifique permissões de escrita
   - Confirme se o SQLite está instalado

3. **Sincronização não executa:**
   - Verifique logs do cron
   - Confirme se o servidor está rodando

4. **Performance lenta:**
   - Verifique índices do banco
   - Monitore uso de memória 