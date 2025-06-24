const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Adicionar CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configuração do banco de dados
const dbPath = path.join(__dirname, 'midias.db');
const db = new sqlite3.Database(dbPath);

// Variáveis de controle
let lastSync = null;
let syncInProgress = false;

// Configurações da API
const API_CONFIG = {
  url: 'https://mupa.app/api/1.1/wf/get_medias_all',
  token: '9c264e50ddb95a215b446412a3b42b58',
  headers: {
    'Authorization': `Token 9c264e50ddb95a215b446412a3b42b58`,
    'Content-Type': 'application/json'
  }
};

// Função para buscar uma página de mídias
async function fetchMediasPage(offset = 0) {
  const params = new URLSearchParams({
    size: '100',
    offset: offset.toString()
  });

  const url = `${API_CONFIG.url}?${params.toString()}`;
  console.log(`🔄 Buscando mídias: ${url}`);

  const response = await axios.get(url, {
    headers: API_CONFIG.headers,
    timeout: 30000
  });

  return response.data?.response;
}

// Inicializar banco de dados
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS midias (
          _id TEXT PRIMARY KEY,
          id TEXT,
          nome TEXT,
          link TEXT,
          tipo TEXT,
          ordem REAL,
          volumeaudio INTEGER,
          time INTEGER,
          inicia TEXT,
          final TEXT,
          range TEXT,
          dias_da_semana TEXT,
          ativado INTEGER,
          grupo_lojas TEXT,
          colecoes TEXT,
          created_date TEXT,
          modified_date TEXT,
          created_by TEXT,
          last_updated TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Erro ao criar tabela:', err);
          reject(err);
        } else {
          console.log('✅ Tabela midias criada/verificada com sucesso');
          resolve();
        }
      });

      // Criar índices para melhor performance
      db.run('CREATE INDEX IF NOT EXISTS idx_grupo_lojas ON midias(grupo_lojas)');
      db.run('CREATE INDEX IF NOT EXISTS idx_ativado ON midias(ativado)');
      db.run('CREATE INDEX IF NOT EXISTS idx_inicia_final ON midias(inicia, final)');
    });
  });
}

// Função para sincronizar mídias
async function sincronizarMidias() {
  if (syncInProgress) {
    console.log('⚠️ Sincronização já em andamento, pulando...');
    return;
  }

  syncInProgress = true;
  const startTime = new Date();
  
  try {
    console.log(`🔄 Iniciando sincronização: ${startTime.toISOString()}`);
    
    // Buscar primeira página
    let pageData = await fetchMediasPage(0);
    if (!pageData?.medias) {
      throw new Error('Resposta da API inválida ou incompleta');
    }

    const totalMedias = pageData.qtd_medias;
    let allMedias = [...pageData.medias];
    let currentOffset = pageData.medias.length;
    
    console.log(`📊 Total esperado: ${totalMedias} mídias`);
    console.log(`📥 Recebidas ${allMedias.length} mídias na primeira página`);

    // Buscar páginas adicionais
    while (currentOffset < totalMedias) {
      console.log(`🔄 Buscando mídias com offset ${currentOffset}`);
      
      try {
        pageData = await fetchMediasPage(currentOffset);
        if (pageData?.medias?.length > 0) {
          allMedias = [...allMedias, ...pageData.medias];
          currentOffset += pageData.medias.length;
          console.log(`📥 Total acumulado: ${allMedias.length} mídias`);
        } else {
          console.warn('⚠️ Página sem mídias, parando paginação');
          break;
        }
      } catch (error) {
        console.error(`❌ Erro ao buscar mídias com offset ${currentOffset}:`, error.message);
        break;
      }

      // Pequena pausa entre requisições para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`📊 Total de ${allMedias.length} mídias coletadas`);

    if (allMedias.length === 0) {
      throw new Error('Nenhuma mídia coletada da API');
    }

    // Primeiro, limpar o banco de dados
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM midias', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('🗑️ Banco de dados limpo');

    let savedCount = 0;
    let errorCount = 0;

    // Processar cada mídia em lotes para evitar sobrecarga
    const batchSize = 50;
    for (let i = 0; i < allMedias.length; i += batchSize) {
      const batch = allMedias.slice(i, i + batchSize);
      
      // Processar lote atual
      const results = await Promise.allSettled(
        batch.map(media => upsertMidia(media))
      );

      // Contabilizar resultados do lote
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          savedCount++;
        } else {
          console.error(`❌ Erro ao processar mídia:`, result.reason);
          errorCount++;
        }
      });

      // Log de progresso
      const progress = Math.round(((i + batch.length) / allMedias.length) * 100);
      console.log(`📈 Progresso: ${progress}% (${i + batch.length}/${allMedias.length})`);
    }

    lastSync = new Date();
    const duration = new Date() - startTime;

    console.log(`✅ Sincronização concluída em ${duration}ms`);
    console.log(`📊 Estatísticas: ${savedCount} salvas, ${errorCount} erros`);
    console.log(`📦 Total no banco: ${savedCount} mídias`);

  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    }
  } finally {
    syncInProgress = false;
  }
}

// Função para inserir/atualizar mídia
function upsertMidia(media) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO midias (
        _id, id, nome, link, tipo, ordem, volumeaudio, time,
        inicia, final, range, dias_da_semana, ativado,
        grupo_lojas, colecoes, created_date, modified_date, created_by, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      media._id,
      media.id,
      media.nome,
      media.link,
      media.tipo,
      media.ordem,
      media.volumeaudio,
      media.time,
      media.inicia,
      media.final,
      JSON.stringify(media.range || []),
      JSON.stringify(media['dias-da-semana'] || []),
      media.ativado ? 1 : 0,
      media['grupo-lojas'],
      media.Coleções,
      media['Created Date'],
      media['Modified Date'],
      media['Created By'],
      now
    ], function(err) {
      if (err) {
        reject(err);
      } else {
        // Verificar se foi inserção ou atualização
        if (this.changes > 0) {
          resolve(this.changes === 1 ? 'inserted' : 'updated');
        } else {
          resolve('no_change');
        }
      }
    });

    stmt.finalize();
  });
}

// Função para verificar se deve sincronizar
function shouldSync() {
  if (!lastSync) return true;
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return lastSync < oneHourAgo;
}

// Função para obter mídias filtradas
function getMidiasFiltradas(grupoLojas, dia = null, timestampAtual = null) {
  return new Promise((resolve, reject) => {
    const now = timestampAtual ? new Date(timestampAtual) : new Date();
    const currentDay = dia || getDiaSemana(now);
    
    let query = `
      SELECT 
        id, nome, link, tipo, ordem, volumeaudio, time,
        inicia, final, dias_da_semana, grupo_lojas, colecoes
      FROM midias 
      WHERE grupo_lojas = ? 
        AND ativado = 1
    `;

    const params = [grupoLojas];

    // Adiciona filtros de data e dia da semana apenas se necessário
    if (timestampAtual) {
      query += `
        AND datetime(inicia) <= datetime(?)
        AND datetime(final) >= datetime(?)
      `;
      params.push(now.toISOString(), now.toISOString());
    }

    if (dia) {
      query += ` AND dias_da_semana LIKE ? `;
      params.push(`%${currentDay}%`);
    }

    query += ` ORDER BY ordem ASC`;

    console.log('📝 Query SQL:', query);
    console.log('📝 Parâmetros:', params);

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('❌ Erro na query SQL:', err);
        reject(err);
      } else {
        // Processar os resultados
        const medias = rows.map(row => ({
          id: row.id,
          nome: row.nome,
          link: row.link,
          tipo: row.tipo,
          ordem: row.ordem,
          volumeaudio: row.volumeaudio,
          time: row.time,
          inicia: row.inicia,
          final: row.final,
          dias_da_semana: JSON.parse(row.dias_da_semana || '[]'),
          grupo_lojas: row.grupo_lojas,
          colecoes: row.colecoes
        }));
        
        console.log(`✅ Encontradas ${medias.length} mídias para o grupo ${grupoLojas}`);
        resolve(medias);
      }
    });
  });
}

// Função auxiliar para obter dia da semana
function getDiaSemana(date) {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return dias[date.getDay()];
}

// Rota para obter mídias por grupo
app.get('/midias/:grupo_lojas', async (req, res) => {
  try {
    const { grupo_lojas } = req.params;
    const { dia, timestamp_atual } = req.query;

    // Verificar se precisa sincronizar
    if (shouldSync()) {
      console.log('🔄 Cache expirado, sincronizando...');
      await sincronizarMidias();
    }

    const medias = await getMidiasFiltradas(grupo_lojas, dia, timestamp_atual);
    
    res.json({
      success: true,
      grupo_lojas,
      total: medias.length,
      ultima_sincronizacao: lastSync?.toISOString(),
      medias
    });

  } catch (error) {
    console.error('❌ Erro na rota /midias:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rota para forçar sincronização manual
app.post('/sincronizar-midias', async (req, res) => {
  try {
    console.log('🔄 Sincronização manual solicitada');
    await sincronizarMidias();
    
    res.json({
      success: true,
      message: 'Sincronização concluída com sucesso',
      ultima_sincronizacao: lastSync?.toISOString()
    });

  } catch (error) {
    console.error('❌ Erro na sincronização manual:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rota de status
app.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    ultima_sincronizacao: lastSync?.toISOString(),
    sincronizacao_em_andamento: syncInProgress,
    porta: PORT
  });
});

// Rota para estatísticas do banco
app.get('/stats', (req, res) => {
  db.get('SELECT COUNT(*) as total FROM midias', (err, row) => {
    if (err) {
      res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({
        success: true,
        total_midias: row.total,
        ultima_sincronizacao: lastSync?.toISOString()
      });
    }
  });
});

// Nova rota para obter mídias válidas de um grupo-lojas por _id
app.get('/get_medias_', async (req, res) => {
  try {
    const { _id, dia, timestamp } = req.query;
    if (!_id) {
      return res.status(400).json({ success: false, error: 'Parâmetro _id é obrigatório' });
    }

    // Verificar se precisa sincronizar
    if (shouldSync()) {
      console.log('🔄 Cache expirado, sincronizando...');
      await sincronizarMidias();
    }

    // Usar timestamp ou timestamp_atual para compatibilidade
    const ts = timestamp || req.query.timestamp_atual;
    const medias = await getMidiasFiltradas(_id, dia, ts);

    res.json({
      success: true,
      grupo_lojas: _id,
      total: medias.length,
      ultima_sincronizacao: lastSync?.toISOString(),
      medias
    });
  } catch (error) {
    console.error('❌ Erro na rota /get_medias_:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para retornar todas as mídias do banco de dados
app.get('/todas-midias', (req, res) => {
  const { page = 1, limit = 50, order = 'desc', orderBy = 'created_date' } = req.query;
  const offset = (page - 1) * limit;

  // Primeiro, obter o total de registros
  db.get('SELECT COUNT(*) as total FROM midias', [], (err, countRow) => {
    if (err) {
      console.error('Erro ao contar mídias:', err);
      return res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }

    // Depois, buscar os registros paginados
    const query = `
      SELECT * FROM midias 
      ORDER BY ${orderBy} ${order}
      LIMIT ? OFFSET ?
    `;
    
    db.all(query, [limit, offset], (err, rows) => {
      if (err) {
        console.error('Erro ao buscar mídias:', err);
        return res.status(500).json({ 
          success: false, 
          error: err.message 
        });
      }
      
      // Processar os resultados
      const midias = rows.map(row => ({
        ...row,
        dias_da_semana: JSON.parse(row.dias_da_semana || '[]'),
        range: JSON.parse(row.range || '[]'),
        ativado: Boolean(row.ativado)
      }));
      
      res.json({ 
        success: true, 
        total: countRow.total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(countRow.total / limit),
        midias 
      });
    });
  });
});

// Agendar sincronização a cada hora
cron.schedule('0 * * * *', () => {
  console.log('⏰ Executando sincronização agendada');
  sincronizarMidias();
});

// Inicializar servidor
async function startServer() {
  try {
    await initializeDatabase();
    
    // Fazer primeira sincronização
    console.log('🚀 Iniciando primeira sincronização...');
    await sincronizarMidias();
    
    app.listen(PORT, () => {
      console.log(`✅ Servidor rodando na porta ${PORT}`);
      console.log(`📊 Endpoints disponíveis:`);
      console.log(`   GET  /midias/:grupo_lojas - Obter mídias filtradas`);
      console.log(`   POST /sincronizar-midias - Forçar sincronização`);
      console.log(`   GET  /status - Status do servidor`);
      console.log(`   GET  /stats - Estatísticas do banco`);
    });

  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
});

// Iniciar servidor
startServer(); 