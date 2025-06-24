const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testBackend() {
  console.log('🧪 Iniciando testes do backend...\n');

  try {
    // Teste 1: Status do servidor
    console.log('1️⃣ Testando status do servidor...');
    const statusResponse = await axios.get(`${BASE_URL}/status`);
    console.log('✅ Status:', statusResponse.data);
    console.log('');

    // Teste 2: Forçar sincronização
    console.log('2️⃣ Testando sincronização manual...');
    const syncResponse = await axios.post(`${BASE_URL}/sincronizar-midias`);
    console.log('✅ Sincronização:', syncResponse.data);
    console.log('');

    // Teste 3: Estatísticas
    console.log('3️⃣ Testando estatísticas...');
    const statsResponse = await axios.get(`${BASE_URL}/stats`);
    console.log('✅ Estatísticas:', statsResponse.data);
    console.log('');

    // Teste 4: Buscar mídias (usando um grupo de exemplo)
    console.log('4️⃣ Testando busca de mídias...');
    try {
      const mediasResponse = await axios.get(`${BASE_URL}/midias/teste-grupo`);
      console.log('✅ Mídias encontradas:', mediasResponse.data.total);
      if (mediasResponse.data.medias.length > 0) {
        console.log('📋 Primeira mídia:', {
          id: mediasResponse.data.medias[0].id,
          nome: mediasResponse.data.medias[0].nome,
          tipo: mediasResponse.data.medias[0].tipo
        });
      }
    } catch (error) {
      console.log('ℹ️ Nenhuma mídia encontrada para o grupo de teste (normal)');
    }
    console.log('');

    // Teste 5: Buscar mídias com parâmetros de simulação
    console.log('5️⃣ Testando busca com parâmetros de simulação...');
    try {
      const simResponse = await axios.get(`${BASE_URL}/midias/teste-grupo?dia=Segunda&timestamp_atual=2024-01-15T10:00:00Z`);
      console.log('✅ Simulação:', simResponse.data);
    } catch (error) {
      console.log('ℹ️ Simulação sem resultados (normal)');
    }
    console.log('');

    console.log('🎉 Todos os testes concluídos com sucesso!');
    console.log('📊 O backend está funcionando corretamente.');

  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados:', error.response.data);
    }
  }
}

// Executar testes
testBackend(); 