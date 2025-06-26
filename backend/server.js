const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5555;

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

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Cria diretório base de uploads se não existir
    const baseDir = './uploads';
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir);
    }

    // Cria diretório para o tipo de arquivo
    let fileType = 'outros';
    if (file.mimetype.startsWith('image/')) fileType = 'imagens';
    else if (file.mimetype.startsWith('video/')) fileType = 'videos';
    else if (file.mimetype.startsWith('audio/')) fileType = 'audios';
    else if (file.mimetype.startsWith('text/')) fileType = 'documentos';
    else if (file.mimetype.includes('pdf')) fileType = 'documentos';
    else if (file.mimetype.includes('word')) fileType = 'documentos';
    else if (file.mimetype.includes('excel')) fileType = 'documentos';
    else if (file.originalname.toLowerCase().endsWith('.apk')) fileType = 'aplicativos';

    const typeDir = path.join(baseDir, fileType);
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir);
    }

    // Cria diretório para o mês atual
    const date = new Date();
    const monthDir = path.join(typeDir, `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    if (!fs.existsSync(monthDir)) {
      fs.mkdirSync(monthDir);
    }

    cb(null, monthDir);
  },
  filename: function (req, file, cb) {
    // Remove caracteres especiais e espaços do nome original
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + cleanName);
  }
});

// Configuração do multer com limites e filtros
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Lista de tipos MIME permitidos
    const allowedMimes = [
      // Aplicativos
      'application/vnd.android.package-archive',
      'application/x-msdownload',
      'application/x-msdos-program',
      // Imagens
      'image/jpeg',
      'image/png',
      'image/gif',
      // Vídeos
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      // Áudios
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      // Documentos
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      // Outros
      'application/zip',
      'application/x-zip-compressed',
      'application/x-rar-compressed'
    ];

    // Permitir APK mesmo que o MIME type não seja reconhecido corretamente
    if (file.originalname.toLowerCase().endsWith('.apk')) {
      cb(null, true);
      return;
    }

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Middleware para servir arquivos estáticos
app.use('/uploads', express.static('uploads'));

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

      // Dropar e recriar a tabela dispositivos
      db.run('DROP TABLE IF EXISTS dispositivos', (err) => {
        if (err) {
          console.error('Erro ao dropar tabela dispositivos:', err);
        } else {
          console.log('✅ Tabela dispositivos removida com sucesso');
          
          // Criar a tabela com a nova estrutura
          db.run(`
            CREATE TABLE IF NOT EXISTS dispositivos (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              serial TEXT UNIQUE NOT NULL,
              status TEXT DEFAULT 'offline',
              apelido TEXT,
              empresa TEXT,
              coduser TEXT,
              ultima_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('Erro ao criar tabela dispositivos:', err);
            } else {
              console.log('✅ Tabela dispositivos criada com sucesso');
              
              // Criar índice
              db.run(`
                CREATE INDEX IF NOT EXISTS idx_dispositivos_serial 
                ON dispositivos(serial)
              `, (err) => {
                if (err) {
                  console.error('Erro ao criar índice dispositivos_serial:', err);
                } else {
                  console.log('✅ Índice dispositivos_serial criado com sucesso');
                }
              });
            }
          });
        }
      });

      // Tabela de arquivos
      db.run(`
        CREATE TABLE IF NOT EXISTS arquivos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          nome_original TEXT NOT NULL,
          descricao TEXT,
          tipo TEXT NOT NULL,
          tamanho INTEGER NOT NULL,
          caminho TEXT NOT NULL,
          url TEXT NOT NULL,
          downloads INTEGER DEFAULT 0,
          data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          categoria TEXT,
          subcategoria TEXT,
          tags TEXT,
          status TEXT DEFAULT 'ativo',
          tipo_arquivo TEXT NOT NULL,
          versao TEXT
        )
      `, (err) => {
        if (err) {
          console.error('Erro ao criar tabela arquivos:', err);
        } else {
          console.log('✅ Tabela arquivos criada/verificada com sucesso');
        }
      });
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

// Endpoint para cadastrar dispositivo
app.post('/dispositivos', (req, res) => {
  const { apelido, empresa, coduser } = req.body;
  if (!apelido || !coduser) {
    return res.status(400).json({ success: false, error: 'Apelido e coduser são obrigatórios' });
  }

  // Gerar serial único (UUID v4 simples)
  const serial = 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  // Status inicial: online
  const status = 'online';

  // Inserir no banco
  const stmt = db.prepare(`
    INSERT INTO dispositivos (serial, status, apelido, empresa, coduser)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run([serial, status, apelido, empresa || '', coduser], function(err) {
    if (err) {
      console.error('Erro ao cadastrar dispositivo:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({
      success: true,
      dispositivo: {
        id: this.lastID,
        serial,
        status,
        apelido,
        empresa: empresa || '',
        coduser
      }
    });
  });
  stmt.finalize();
});

// Endpoint para atualizar status do dispositivo
app.put('/dispositivos/:serial/status', (req, res) => {
  const { serial } = req.params;
  const { status } = req.body;

  console.log(`📱 Atualizando status do dispositivo ${serial} para ${status}`);

  // Validação dos parâmetros
  if (!serial || !status) {
    console.error('❌ Serial e status são obrigatórios');
    return res.status(400).json({ 
      success: false, 
      error: 'Serial e status são obrigatórios' 
    });
  }

  // Validação do status
  if (!['online', 'offline'].includes(status)) {
    console.error(`❌ Status inválido: ${status}`);
    return res.status(400).json({
      success: false,
      error: 'Status deve ser "online" ou "offline"'
    });
  }

  // Primeiro verifica se o dispositivo existe
  db.get('SELECT id FROM dispositivos WHERE serial = ?', [serial], (err, row) => {
    if (err) {
      console.error('❌ Erro ao verificar dispositivo:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!row) {
      console.log(`📱 Dispositivo ${serial} não encontrado, criando novo registro...`);
      // Se não existe, cria um novo dispositivo
      db.run(`
            INSERT INTO dispositivos (serial, status)
            VALUES (?, ?)
      `, [serial, status], function(err) {
        if (err) {
          console.error('❌ Erro ao criar dispositivo:', err);
          return res.status(500).json({ success: false, error: err.message });
        }
        console.log(`✅ Novo dispositivo criado com sucesso: ${serial}`);
        res.json({
          success: true,
          message: 'Novo dispositivo registrado com sucesso',
          deviceId: this.lastID
        });
      });
    } else {
      // Se existe, atualiza o status
      db.run(`
        UPDATE dispositivos 
        SET status = ?,
            ultima_atualizacao = CURRENT_TIMESTAMP
        WHERE serial = ?
      `, [status, serial], function(err) {
        if (err) {
          console.error('❌ Erro ao atualizar status:', err);
          return res.status(500).json({ success: false, error: err.message });
        }

        console.log(`✅ Status atualizado com sucesso: ${serial} -> ${status}`);
        res.json({
          success: true,
          message: 'Status atualizado com sucesso',
          changes: this.changes
        });
      });
    }
  });
});

// Endpoint para listar dispositivos
app.get('/dispositivos', (req, res) => {
  console.log('📱 Listando todos os dispositivos...');

  const query = `
    SELECT 
      id,
      serial,
      status,
      apelido,
      empresa,
      coduser,
      ultima_atualizacao,
      CASE 
        WHEN status = 'online' AND (strftime('%s', 'now') - strftime('%s', ultima_atualizacao)) <= 30 
        THEN 'online'
        ELSE 'offline'
      END as status_atual,
      strftime('%Y-%m-%d %H:%M:%S', ultima_atualizacao) as ultima_atualizacao_formatada
    FROM dispositivos
    ORDER BY 
      CASE WHEN status = 'online' THEN 0 ELSE 1 END,
      ultima_atualizacao DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ Erro ao listar dispositivos:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    // Processa os resultados para adicionar informações adicionais
    const devices = rows.map(device => {
      const lastUpdate = new Date(device.ultima_atualizacao);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

      return {
        ...device,
        ultima_atualizacao_relativa: formatTimeAgo(diffInSeconds),
        status_atual: device.status_atual,
        online: device.status_atual === 'online'
      };
    });

    console.log(`✅ ${devices.length} dispositivos encontrados`);
    res.json({
      success: true,
      devices
    });
  });
});

// Função auxiliar para formatar o tempo decorrido
function formatTimeAgo(seconds) {
  if (seconds < 60) return `${seconds} segundos atrás`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} horas atrás`;
  return `${Math.floor(seconds / 86400)} dias atrás`;
}

// Endpoints para gerenciamento de arquivos

// Upload de arquivo
app.post('/storage/upload', upload.single('arquivo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nenhum arquivo enviado' 
      });
    }

    // Determina o tipo de arquivo
    let tipoArquivo = 'outro';
    if (req.file.mimetype.startsWith('image/')) tipoArquivo = 'imagem';
    else if (req.file.mimetype.startsWith('video/')) tipoArquivo = 'video';
    else if (req.file.mimetype.startsWith('audio/')) tipoArquivo = 'audio';
    else if (req.file.mimetype.startsWith('text/') || 
             req.file.mimetype.includes('pdf') || 
             req.file.mimetype.includes('word') || 
             req.file.mimetype.includes('excel')) tipoArquivo = 'documento';
    else if (req.file.originalname.toLowerCase().endsWith('.apk')) tipoArquivo = 'aplicativo';

    // Prepara os dados para inserção
    const fileData = {
      nome: req.file.filename,
      nome_original: req.file.originalname,
      descricao: req.body.descricao || '',
      tipo: req.body.categoria || 'outros',
      tamanho: req.file.size,
      caminho: req.file.path,
      url: `/uploads/${req.file.filename}`,
      categoria: req.body.categoria || 'outros',
      subcategoria: req.body.subcategoria || '',
      tags: req.body.tags || '',
      tipo_arquivo: tipoArquivo,
      versao: req.body.versao || null
    };

    // Insere o arquivo no banco de dados
    const sql = `
      INSERT INTO arquivos (
        nome, nome_original, descricao, tipo, tamanho, 
        caminho, url, categoria, subcategoria, tags, 
        tipo_arquivo, versao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
      fileData.nome,
      fileData.nome_original,
      fileData.descricao,
      fileData.tipo,
      fileData.tamanho,
      fileData.caminho,
      fileData.url,
      fileData.categoria,
      fileData.subcategoria,
      fileData.tags,
      fileData.tipo_arquivo,
      fileData.versao
    ], function(err) {
      if (err) {
        console.error('Erro ao inserir arquivo:', err);
        return res.status(500).json({ 
          success: false, 
          error: 'Erro ao salvar arquivo no banco de dados' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Arquivo enviado com sucesso',
        file: {
          ...fileData,
          id: this.lastID
        }
      });
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

// Listar arquivos
app.get('/storage/arquivos', (req, res) => {
  const { categoria, subcategoria, tipo, busca } = req.query;
  let query = 'SELECT * FROM arquivos WHERE status = "ativo"';
  const params = [];

  if (categoria && categoria !== 'todos') {
    query += ' AND categoria = ?';
    params.push(categoria);
  }

  if (subcategoria) {
    query += ' AND subcategoria = ?';
    params.push(subcategoria);
  }

  if (tipo) {
    query += ' AND tipo_arquivo = ?';
    params.push(tipo);
  }

  if (busca) {
    query += ' AND (nome_original LIKE ? OR descricao LIKE ? OR tags LIKE ?)';
    const termoBusca = `%${busca}%`;
    params.push(termoBusca, termoBusca, termoBusca);
  }

  query += ' ORDER BY data_upload DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erro ao listar arquivos:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    // Agrupa arquivos por categoria
    const arquivosAgrupados = rows.reduce((acc, arquivo) => {
      const cat = arquivo.categoria || 'Sem Categoria';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(arquivo);
      return acc;
    }, {});

    res.json({
      success: true,
      arquivos: rows,
      arquivosAgrupados
    });
  });
});

// Download de arquivo
app.get('/storage/download/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM arquivos WHERE id = ?', [id], (err, arquivo) => {
    if (err) {
      console.error('Erro ao buscar arquivo:', err);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!arquivo) {
      return res.status(404).json({ 
        success: false, 
        error: 'Arquivo não encontrado' 
      });
    }

    // Incrementa contador de downloads
    db.run('UPDATE arquivos SET downloads = downloads + 1 WHERE id = ?', [id]);

    // Envia o arquivo
    res.download(arquivo.caminho, arquivo.nome, (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo:', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    });
  });
});

// Inicializar servidor
async function startServer() {
  try {
    await initializeDatabase();
    
    // Fazer primeira sincronização
    console.log('🚀 Iniciando primeira sincronização...');
    await sincronizarMidias();
    
    app.listen(PORT, '0.0.0.0', () => {
      const os = require('os');
      const ifaces = os.networkInterfaces();
      const ips = Object.values(ifaces).flat().filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
      console.log(`✅ Servidor rodando na porta ${PORT} e aceitando conexões externas`);
      ips.forEach(ip => console.log(`➡️  Acesse: http://${ip}:${PORT}`));
      console.log(`📊 Endpoints disponíveis:`);
      console.log(`   GET  /midias/:grupo_lojas - Obter mídias filtradas`);
      console.log(`   POST /sincronizar-midias - Forçar sincronização`);
      console.log(`   GET  /storage/arquivos - Listar arquivos`);
      console.log(`   POST /storage/upload - Upload de arquivo`);
      console.log(`   GET  /storage/download/:id - Download de arquivo`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();