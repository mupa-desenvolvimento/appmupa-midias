import React, { useState } from 'react';
import { ProductService } from '../lib/api/products';

const AudioTest = () => {
  const [barcode, setBarcode] = useState('');
  const [audioData, setAudioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const testAudio = async () => {
    if (!barcode.trim()) {
      setError('Por favor, insira um código de barras');
      return;
    }

    setLoading(true);
    setError(null);
    setAudioData(null);

    try {
      console.log('🎵 Testando áudio para código:', barcode);
      const response = await ProductService.getProductAudio(barcode);
      console.log('✅ Resposta recebida:', response);
      setAudioData(response);
    } catch (err) {
      console.error('❌ Erro ao buscar áudio:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async () => {
    if (!audioData?.audio_url) {
      setError('Nenhuma URL de áudio disponível');
      return;
    }

    try {
      setIsPlaying(true);
      setError(null);
      console.log('🔊 Reproduzindo áudio:', audioData.audio_url);
      
      const audio = new Audio(audioData.audio_url);
      
      audio.onloadstart = () => console.log('📡 Carregando áudio...');
      audio.oncanplay = () => console.log('✅ Áudio pronto para reproduzir');
      audio.onplay = () => console.log('▶️ Áudio iniciado');
      audio.onended = () => {
        console.log('⏹️ Áudio finalizado');
        setIsPlaying(false);
      };
      audio.onerror = (e) => {
        console.error('❌ Erro ao reproduzir áudio:', e);
        setError('Erro ao reproduzir áudio');
        setIsPlaying(false);
      };

      await audio.play();
    } catch (err) {
      console.error('❌ Erro ao reproduzir áudio:', err);
      setError('Erro ao reproduzir áudio: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
      setIsPlaying(false);
    }
  };

  const testWithSampleCodes = () => {
    const sampleCodes = ['7891000100103', '7891000053508', '7891000315507', '7891000100004'];
    const randomCode = sampleCodes[Math.floor(Math.random() * sampleCodes.length)];
    setBarcode(randomCode);
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f5f5f5', 
      borderRadius: '8px', 
      margin: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ color: '#333', marginBottom: '20px' }}>🎵 Teste de Áudio do Produto</h2>
      
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Digite o código de barras"
          style={{
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '300px',
            marginRight: '10px'
          }}
        />
        <button
          onClick={testAudio}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '🔄 Carregando...' : '🔍 Buscar Áudio'}
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={testWithSampleCodes}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🎲 Usar Código de Exemplo
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          ❌ {error}
        </div>
      )}

      {audioData && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <h3>✅ Dados do Áudio Recebidos:</h3>
          <p><strong>Texto:</strong> {audioData.texto}</p>
          <p><strong>Hash:</strong> {audioData.audio_hash}</p>
          <p><strong>URL:</strong> <a href={audioData.audio_url} target="_blank" rel="noopener noreferrer">{audioData.audio_url}</a></p>
          
          <button
            onClick={playAudio}
            disabled={isPlaying}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: isPlaying ? '#6c757d' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isPlaying ? 'not-allowed' : 'pointer',
              marginTop: '10px'
            }}
          >
            {isPlaying ? '🔊 Reproduzindo...' : '▶️ Reproduzir Áudio'}
          </button>
        </div>
      )}

      <div style={{
        fontSize: '12px',
        color: '#666',
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#e9ecef',
        borderRadius: '4px'
      }}>
        <strong>📋 Instruções:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
          <li>Digite um código de barras válido ou use o botão "Usar Código de Exemplo"</li>
          <li>Clique em "Buscar Áudio" para testar o endpoint</li>
          <li>Se o áudio for encontrado, clique em "Reproduzir Áudio" para testá-lo</li>
          <li>Verifique o console do navegador para logs detalhados</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioTest; 