import { useEffect, useState } from 'react';
import { Product } from '../types';
import { useAudio } from '../contexts/AudioContext';
import { getMupaToken, getProductImageAndColors } from '../lib/api/mupaImage';
import { ProductService } from '../lib/api/products';
import { useMediaCache } from '../hooks/useMediaCache';

interface ProductLayout1Props {
  product: Product;
}

// Componente para exibir uma cor da paleta
const ColorPalette = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <div 
      className="w-6 h-6 rounded-full shadow-lg" 
      style={{ 
        background: color,
        border: '2px solid rgba(255,255,255,0.2)'
      }} 
    />
    <span className="text-xs font-mono opacity-60">{label}: {color}</span>
  </div>
);

const ProductLayout1 = ({ product }: ProductLayout1Props) => {
  const { setAudioPlaying, setSpeechPlaying, stopCurrentAudio } = useAudio();
  const [imageUrl, setImageUrl] = useState<string>(product.imageUrl);
  const [cores, setCores] = useState<{
    dominante?: string;
    secundaria?: string;
    terciaria?: string;
    quaternaria?: string;
    mais_clara?: string;
  }>({});

  // Cache da imagem do produto
  const { 
    cachedUrl: cachedImageUrl, 
    isLoading: imageLoading, 
    error: imageError,
    isOnline 
  } = useMediaCache(imageUrl, 'image');

  useEffect(() => {
    let isMounted = true;
    async function fetchImageAndColors() {
      try {
        const t = await getMupaToken();
        if (!isMounted) return;
        const data = await getProductImageAndColors(product.barcode, t);
        if (!isMounted) return;
        if (data.imagem_url) {
          setImageUrl(data.imagem_url.replace(/\\/g, '/'));
        }
        if (data.cores) {
          console.log('Cores recebidas da API:', data.cores);
          setCores(data.cores);
        }
      } catch (e) {
        console.warn('Erro ao buscar imagem/cores Mupa:', e);
      }
    }
    fetchImageAndColors();
    return () => { isMounted = false; };
  }, [product.barcode]);

  // Reproduzir áudio dos detalhes do produto (opcional)
  useEffect(() => {
    let isMounted = true;
    async function playProductAudio() {
      try {
        console.log('Tentando buscar áudio para produto:', product.barcode);
        const audioData = await ProductService.getProductAudio(product.barcode);
        if (!isMounted) return;
        
        console.log('Dados de áudio recebidos:', audioData);
        
        if (audioData && audioData.audio_url) {
          console.log('Reproduzindo áudio do produto:', audioData.audio_url);
          const audio = new Audio(audioData.audio_url);
          audio.play().catch(e => console.warn('Erro ao reproduzir áudio:', e));
        } else {
          console.log('Nenhum áudio disponível para este produto');
        }
      } catch (error) {
        // Silenciar os erros de áudio para não poluir o console
        // O áudio é opcional - se não estiver disponível, não é um problema crítico
        console.info('Áudio não disponível para o produto:', product.barcode);
      }
    }
    
    // Adicionar um pequeno delay para evitar chamadas muito rápidas
    const timeoutId = setTimeout(() => {
      playProductAudio();
    }, 500);
    
    return () => { 
      isMounted = false; 
      clearTimeout(timeoutId);
    };
  }, [product.barcode]);

  // Falar o preço do produto usando síntese de voz
    useEffect(() => {
    let isMounted = true;
    
    console.log('🎯 useEffect de áudio executado para produto:', {
      barcode: product.barcode,
      isOnSale: product.isOnSale,
      tipo_preco: product.displayInfo?.tipo_preco,
      hasAudioUrl: !!product.audioUrl
    });

    async function speakPrice() {
      try {
        console.log('🔊 Iniciando áudio do preço...');
        console.log('📋 Código de barras usado na consulta:', product.barcode);
        console.log('🏷️ Tipo de preço:', product.displayInfo?.tipo_preco);
        console.log('🛒 Produto em promoção:', product.isOnSale);
        console.log('🎵 AudioUrl disponível:', !!product.audioUrl);
        
        // Primeiro, tentar usar o audioUrl que já vem do produto (mesmo código de barras da consulta)
        if (product.audioUrl) {
          console.log('🎵 Usando áudio já carregado do produto:', product.audioUrl);
          
          // Reproduzir o áudio da API
          const audio = new Audio(product.audioUrl);
          audio.volume = 0.8;
          
          audio.onloadstart = () => console.log('🎵 Carregando áudio do preço...');
          audio.oncanplay = () => console.log('✅ Áudio do preço pronto para reproduzir');
          audio.onplay = () => {
            console.log('▶️ Reproduzindo áudio do preço');
            setAudioPlaying(audio); // Registrar no contexto
          };
          audio.onended = () => {
            console.log('⏹️ Áudio do preço finalizado');
            setAudioPlaying(null); // Remover do contexto
          };
          audio.onerror = (e) => {
            console.error('❌ Erro ao reproduzir áudio do preço:', e);
            setAudioPlaying(null); // Remover do contexto
            // Fallback para nova requisição ou síntese de voz
            tryFetchAudioAgain();
          };

          if (isMounted) {
            await audio.play();
            return; // Sucesso, não precisa continuar
          }
        } else {
          console.log('⚠️ Nenhum audioUrl disponível, indo direto para busca...');
        }
        
        // Se não tem audioUrl, tentar buscar novamente com o mesmo código de barras
        tryFetchAudioAgain();
        
      } catch (error) {
        console.error('❌ Erro geral no áudio do preço:', error);
        // Fallback para síntese de voz local
        fallbackToSpeechSynthesis();
      }
    }

    async function tryFetchAudioAgain() {
      try {
        console.log('🔄 Tentando buscar áudio novamente...');
        const audioEndpoint = `/api/produto/codbar/${product.barcode}/audio_detalhe`;
        console.log('🎯 Endpoint do áudio:', audioEndpoint);
        
        // Buscar áudio do preço via endpoint audio_detalhe (mesmo código da consulta)
        const audioResponse = await fetch(audioEndpoint, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (audioResponse.ok) {
          const audioResult = await audioResponse.json();
          console.log('🎵 Resposta do áudio do preço:', audioResult);
          
          if (audioResult.audio_url) {
            // Reproduzir o áudio da API
            const audio = new Audio(audioResult.audio_url);
            audio.volume = 0.8;
            
            audio.onloadstart = () => console.log('🎵 Carregando áudio do preço (nova requisição)...');
            audio.oncanplay = () => console.log('✅ Áudio do preço pronto para reproduzir');
            audio.onplay = () => {
              console.log('▶️ Reproduzindo áudio do preço');
              setAudioPlaying(audio); // Registrar no contexto
            };
            audio.onended = () => {
              console.log('⏹️ Áudio do preço finalizado');
              setAudioPlaying(null); // Remover do contexto
            };
            audio.onerror = (e) => {
              console.error('❌ Erro ao reproduzir áudio do preço:', e);
              setAudioPlaying(null); // Remover do contexto
              // Fallback para síntese de voz local
              fallbackToSpeechSynthesis();
            };

            if (isMounted) {
              await audio.play();
            }
          } else {
            console.warn('⚠️ URL de áudio não encontrada na resposta');
            // Fallback para síntese de voz local
            fallbackToSpeechSynthesis();
          }
        } else {
          console.warn('⚠️ Erro na requisição de áudio:', audioResponse.status, 'Status Text:', audioResponse.statusText);
          console.log('🔄 Iniciando fallback para síntese de voz...');
          // Fallback para síntese de voz local
          fallbackToSpeechSynthesis();
        }
      } catch (error) {
        console.error('❌ Erro ao buscar áudio do preço:', error);
        // Fallback para síntese de voz local
        fallbackToSpeechSynthesis();
      }
    }

    function fallbackToSpeechSynthesis() {
      try {
        console.log('🔄 EXECUTANDO FALLBACK - Usando síntese de voz...');
        
        // Verificar se a API de síntese de voz está disponível
        if (!('speechSynthesis' in window)) {
          console.warn('❌ Síntese de voz não suportada neste navegador');
          return;
        }

        console.log('✅ SpeechSynthesis disponível, prosseguindo...');

        // Cancelar qualquer fala anterior
        window.speechSynthesis.cancel();

        // Preparar o texto do preço
        let priceText = '';
        
        console.log('🏷️ Determinando tipo de fala para:', {
          tipo_preco: product.displayInfo?.tipo_preco,
          isOnSale: product.isOnSale,
          normalPrice: product.normalPrice,
          salePrice: product.salePrice
        });
        
        if (product.displayInfo?.tipo_preco === 'de_por' || product.displayInfo?.tipo_preco === 'preco_de_por') {
          // Para ofertas de/por
          const priceFrom = product.normalPrice.toFixed(2).replace('.', ' reais e ').replace(/(\d{2})$/, '$1 centavos');
          const priceTo = product.salePrice ? product.salePrice.toFixed(2).replace('.', ' reais e ').replace(/(\d{2})$/, '$1 centavos') : '';
          priceText = `Produto em oferta! De ${priceFrom}, por apenas ${priceTo}`;
        } else if (product.displayInfo?.tipo_preco === 'leve_pague') {
          // Para leve/pague
          const normalPrice = product.normalPrice.toFixed(2).replace('.', ' reais e ').replace(/(\d{2})$/, '$1 centavos');
          priceText = `Oferta especial ${product.displayInfo.tipo_oferta}! Preço normal: ${normalPrice}`;
        } else if (product.displayInfo?.tipo_preco === 'desconto_segunda_unidade') {
          // Para desconto na segunda unidade
          const normalPrice = product.normalPrice.toFixed(2).replace('.', ' reais e ').replace(/(\d{2})$/, '$1 centavos');
          priceText = `Oferta especial! ${product.displayInfo.tipo_oferta}. Preço unitário: ${normalPrice}`;
        } else {
          // Preço normal ou outros casos
          const normalPrice = product.normalPrice.toFixed(2).replace('.', ' reais e ').replace(/(\d{2})$/, '$1 centavos');
          if (product.isOnSale && product.salePrice) {
            const salePrice = product.salePrice.toFixed(2).replace('.', ' reais e ').replace(/(\d{2})$/, '$1 centavos');
            priceText = `Produto em promoção! Preço: ${salePrice}`;
          } else {
            // PREÇO NORMAL - sempre gerar voz
            priceText = `Preço normal de venda: ${normalPrice}`;
          }
        }
        
        console.log('📝 Texto gerado para síntese:', priceText);

        // Criar e configurar a fala
        const utterance = new SpeechSynthesisUtterance(priceText);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        // Adicionar listeners para debug e controle de contexto
        utterance.onstart = () => {
          console.log('🎤 Síntese de voz iniciada');
          setSpeechPlaying(true); // Marca síntese como ativa
        };
        utterance.onend = () => {
          console.log('🎤 Síntese de voz finalizada');
          setSpeechPlaying(false); // Remove síntese do contexto
        };
        utterance.onerror = (e) => {
          console.error('❌ Erro na síntese de voz:', e);
          setSpeechPlaying(false); // Remove síntese do contexto
        };
        utterance.onpause = () => console.log('⏸️ Síntese de voz pausada');
        utterance.onresume = () => console.log('▶️ Síntese de voz retomada');

        console.log('🗣️ Preparando para falar preço (fallback):', priceText);
        console.log('📢 Configurações de voz:', { lang: 'pt-BR', rate: 0.9, pitch: 1.0, volume: 0.8 });

        // Falar o preço
        if (isMounted) {
          console.log('▶️ EXECUTANDO speechSynthesis.speak()...');
          window.speechSynthesis.speak(utterance);
          console.log('✅ Comando speak() enviado');
        } else {
          console.log('⚠️ Componente desmontado, não executando fala');
        }
      } catch (error) {
        console.warn('❌ Erro no fallback de síntese de voz:', error);
      }
    }

    // Adicionar delay para evitar conflito com o áudio do produto
    console.log('⏰ Configurando timeout de 2 segundos para áudio do preço...');
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.log('⏰ Timeout executado, iniciando speakPrice...');
        speakPrice();
      } else {
        console.log('⏰ Timeout executado mas componente desmontado');
      }
    }, 2000); // 2 segundos de delay

    return () => { 
      isMounted = false; 
      clearTimeout(timeoutId);
      // Cancelar qualquer fala em andamento quando o componente for desmontado
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [product.barcode, product.normalPrice, product.salePrice, product.isOnSale, product.displayInfo]);

  const description = (product.description || product.name || '').toUpperCase();
  const descWords = description.split(' ');
  const firstLine = descWords.slice(0, 2).join(' ');
  const secondLine = descWords.slice(2).join(' ');

  const price = product.normalPrice.toFixed(2).replace('.', ',');
  const [reais, centavos] = price.split(',');
  const salePrice = product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : null;

  // Para o novo formato DE/POR, ajustar as variáveis de preço
  const isDePorFormat = product.displayInfo?.tipo_preco === 'POR' && product.displayInfo?.tipo_oferta === 'DE';
  const priceToShow = isDePorFormat ? (product.salePrice || product.normalPrice) : product.normalPrice;
  const priceToShowFormatted = priceToShow.toFixed(2).replace('.', ',');
  const [reaisToShow, centavosToShow] = priceToShowFormatted.split(',');
  const originalPrice = isDePorFormat ? product.normalPrice : null;
  const originalPriceFormatted = originalPrice ? originalPrice.toFixed(2).replace('.', ',') : null;

  const economia = product.salePrice
    ? Math.round(((product.normalPrice - product.salePrice) / product.normalPrice) * 100)
    : null;

  // Cores do JSON (com fallback)
  const corMaisClara = cores.mais_clara || cores.terciaria || '#f0f0f0';
  const corSecundariaWave = cores.secundaria || '#0d689f';

  // Usar as cores da API ou fallback para cores personalizadas
  const corDominante = cores.dominante || product.displayInfo?.dominante || '#184595'; // Azul personalizado
  const corSecundaria = cores.secundaria || product.displayInfo?.secundaria || '#E12D2D'; // Vermelho para card do valor
  const corTercearia = cores.terciaria || product.displayInfo?.terciaria || '#C41E3A'; // Vermelho mais fraco para descrição

  function getLightestColor(...colors: string[]) {
    function luminance(hex: string) {
      if (!hex) return 0;
      const c = hex.replace('#', '');
      const r = parseInt(c.substr(0, 2), 16);
      const g = parseInt(c.substr(2, 2), 16);
      const b = parseInt(c.substr(4, 2), 16);
      return (r * 0.299 + g * 0.587 + b * 0.114);
    }
    return colors.filter(Boolean).sort((a, b) => luminance(b) - luminance(a))[0];
  }

  const corMaisClaraTexto = getLightestColor(
    corDominante,
    corSecundaria,
    corTercearia,
    cores.quaternaria
  ) || '#fff';

  function isColorLight(hex: string) {
    if (!hex) return false;
    const c = hex.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
  }

  const valorFontColor = isColorLight(corTercearia) ? '#222' : '#fff';

  const poppinsMedium = 'Poppins-Medium, Poppins, sans-serif';
  const poppinsLight = 'Poppins-Light, Poppins, sans-serif';
  const bebasNeue = 'BebasNeue-Regular, Bebas Neue, sans-serif';

  // Função para decidir cor de texto baseada no fundo
  function getContrastTextColor(bg: string) {
    if (!bg) return '#fff';
    const c = bg.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186 ? '#222' : '#fff';
  }

  // Função para obter efeito de brilho com contraste adequado
  function getShineEffect(backgroundColor: string, intensity: number = 0.15) {
    if (!backgroundColor) return 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)';
    
    const isLight = isColorLight(backgroundColor);
    
    if (isLight) {
      // Para cores claras, usar brilho escuro
      return `linear-gradient(45deg, transparent 10%, rgba(0,0,0,${intensity}) 50%, transparent 70%)`;
    } else {
      // Para cores escuras, usar brilho claro
      return `linear-gradient(45deg, transparent 10%, rgba(255,255,255,${intensity}) 50%, transparent 70%)`;
    }
  }

  const textOnDominante = getContrastTextColor(corDominante);
  const textOnSecundaria = getContrastTextColor(corSecundaria);
  const textOnTerciaria = getContrastTextColor(corTercearia);

  // SVG de risco diagonal para o fundo
  const svgWaveBg = (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 1200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', zIndex: 0 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="diagonalGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={corDominante} />
          <stop offset="100%" stopColor={corSecundariaWave} />
        </linearGradient>
        <filter id="blur" x="-50%" y="-50%" width="500%" height="700%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="60" />
        </filter>
      </defs>
      {/* Risco diagonal principal super suave */}
      <path
        d="M0,100 Q200,80 400,120 Q600,160 800,140 L800,900 Q600,920 400,880 Q200,840 0,860 Z"
        fill="url(#diagonalGradient)"
        opacity="0.12"
        filter="url(#blur)"
      />
      {/* Risco diagonal secundário ultra suave */}
      <path
        d="M0,200 Q200,180 400,220 Q600,260 800,240 L800,1000 Q600,1020 400,980 Q200,940 0,960 Z"
        fill="url(#diagonalGradient)"
        opacity="0.06"
        filter="url(#blur)"
      />
    </svg>
  );

  return (
    <div className="w-full h-full flex flex-row" style={{ background: '#fff' }}>
      {/* Lado esquerdo: 50% */}
      <div className="flex flex-col h-full px-0 py-12 relative overflow-hidden" style={{ 
        background: `linear-gradient(135deg, ${corDominante} 0%, ${corSecundaria} 100%)`,
        width: '50vw', 
        minHeight: '100vh',
      }}>
        {/* SVG de risco diagonal no fundo */}
        {svgWaveBg}
        {/* Card do nome/descrição e valor alinhados em coluna */}
        <div style={{ width: '100%', position: 'relative', zIndex: 10 }}>
          {/* Card do nome/descrição */}
          <div style={{
            background: corTercearia, // Usar vermelho mais fraco
            borderRadius: 0,
            padding: '18px 32px 12px 32px',
            margin: 0,
            width: '100%',
            maxWidth: '100%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            color: textOnTerciaria, // Usar cor de texto adequada
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'flex-start',
            position: 'relative',
            zIndex: 10,
          }}>
            <div style={{ fontFamily: poppinsMedium, fontSize: '2.6rem', lineHeight: 1.1, letterSpacing: 1, textAlign: 'left', width: '100%' }}>{firstLine}</div>
            {secondLine && (
              <div style={{ fontFamily: poppinsLight, fontSize: '1.4rem', opacity: 0.85, lineHeight: 1.1, textAlign: 'left', width: '100%' }}>{secondLine}</div>
            )}
          </div>

          {/* Tipo de oferta - se existir - OCULTAR quando for preço normal */}
          {product.displayInfo?.tipo_oferta && product.displayInfo?.tipo_preco === 'leve_pague' && product.isOnSale && (
            <div style={{
              display: 'flex',
              gap: '8px',
              margin: '12px 0 0 32px',
              position: 'relative',
              zIndex: 10,
            }}>
              {/* Badge Leve */}
              <div style={{
                background: '#E53E3E',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'white',
                fontFamily: poppinsMedium,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {product.displayInfo.tipo_oferta.split(' ')[0]} {product.displayInfo.tipo_oferta.split(' ')[1]}
              </div>
              {/* Badge Pague */}
              <div style={{
                background: '#3182CE',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'white',
                fontFamily: poppinsMedium,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {product.displayInfo.tipo_oferta.split(' ')[2]} {product.displayInfo.tipo_oferta.split(' ')[3] || ''}
              </div>
            </div>
          )}

          {/* Badges para desconto_segunda_unidade - OCULTAR quando for preço normal */}
          {product.displayInfo?.tipo_preco === 'desconto_segunda_unidade' && product.isOnSale && (
            <div style={{
              display: 'flex',
              gap: '8px',
              margin: '12px 0 0 32px',
              position: 'relative',
              zIndex: 10,
            }}>
              {/* Badge do desconto (ex: 50% off) */}
              <div style={{
                background: '#E53E3E',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'white',
                fontFamily: poppinsMedium,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {product.displayInfo.tipo_oferta ? 
                  product.displayInfo.tipo_oferta.split(' ').slice(0, 2).join(' ') : 
                  '50% OFF'
                }
              </div>
              {/* Badge da condição (ex: na 2ª unidade) */}
              <div style={{
                background: '#3182CE',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'white',
                fontFamily: poppinsMedium,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'lowercase',
                letterSpacing: 0.5,
              }}>
                {product.displayInfo.tipo_oferta ? 
                  product.displayInfo.tipo_oferta.split(' ').slice(2).join(' ') : 
                  'na 2ª unidade'
                }
              </div>
            </div>
          )}

          {/* Tipo de oferta padrão - para outros tipos - OCULTAR quando for preço normal */}
          {product.displayInfo?.tipo_oferta && product.displayInfo?.tipo_preco !== 'leve_pague' && product.displayInfo?.tipo_preco !== 'desconto_segunda_unidade' && product.isOnSale && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              padding: '8px 16px',
              margin: '12px 0 0 32px',
              width: 'fit-content',
              color: textOnDominante,
              fontFamily: poppinsMedium,
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: 1,
              position: 'relative',
              zIndex: 10,
              backdropFilter: 'blur(10px)',
            }}>
              🎯 {product.displayInfo.tipo_oferta}
            </div>
          )}

          {/* Badge "PREÇO NORMAL" quando não há promoção */}
          {!product.isOnSale && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 12,
              padding: '8px 16px',
              margin: '12px 0 0 32px',
              width: 'fit-content',
              color: textOnDominante,
              fontFamily: poppinsMedium,
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: 1,
              position: 'relative',
              zIndex: 10,
              backdropFilter: 'blur(10px)',
            }}>
              💰 PREÇO NORMAL
            </div>
          )}

          {/* Card do valor alinhado à esquerda com padding reduzido e efeito de brilho */}
          <div style={{
            background: corSecundaria,
            borderRadius: 18,
            padding: '8px 16px 0px 16px',
            margin: '24px 0 0 32px',
            width: 'fit-content',
            minWidth: 120,
            boxShadow: '0 6px 32px 0 rgba(0,0,0,0.25)',
            color: textOnSecundaria,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            height: 'min-content',
            position: 'relative',
            overflow: 'hidden',
            zIndex: 10,
          }}>
            {/* Efeito de brilho no fundo - adaptativo baseado na cor */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: getShineEffect(corSecundaria, 0.2),
              animation: 'shine 3s ease-in-out infinite',
              zIndex: 1,
            }} />
            {/* Preço riscado para ofertas de_por e preco_de_por */}
            {(product.displayInfo?.tipo_preco === 'de_por' || product.displayInfo?.tipo_preco === 'preco_de_por' || isDePorFormat) && originalPrice && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px',
                opacity: 0.7,
                position: 'relative',
                zIndex: 2,
              }}>
                <span style={{ fontSize: '1.2rem', marginRight: 8 }}>DE</span>
                <span style={{ fontSize: '1.2rem', marginRight: 8 }}>R$</span>
                <span 
                  className="number" 
                  style={{ 
                    fontFamily: bebasNeue, 
                    fontSize: '2.8rem', 
                    fontWeight: 700, 
                    lineHeight: 1,
                    textDecoration: 'line-through',
                    textDecorationColor: textOnSecundaria,
                    textDecorationThickness: '3px',
                  }}
                >
                  {originalPriceFormatted}
                </span>
              </div>
            )}
            
            {/* Preço principal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              textAlign: 'left',
              position: 'relative',
              zIndex: 2,
            }}>
              {(product.displayInfo?.tipo_preco === 'de_por' || product.displayInfo?.tipo_preco === 'preco_de_por' || isDePorFormat) && (
                <span style={{ fontSize: '1.4rem', marginRight: 12 }}>POR</span>
              )}
              <span style={{ fontSize: '1.7rem', verticalAlign: 'top', marginRight: 12, margin: 0, padding: 0 }}>R$</span>
              <span className="number" style={{ fontFamily: bebasNeue, fontSize: '6.2rem', fontWeight: 700, lineHeight: 1, margin: 0, padding: 0, display: 'block' }}>
                {reaisToShow}
              </span>
              <span style={{ fontSize: '2.8rem', marginLeft: 4, margin: 0, padding: 0 }}>
                ,<span className="number">
                  {centavosToShow}
                </span>
              </span>
            </div>
          </div>

          {/* Detalhes da oferta - layout unificado para todos os tipos - OCULTAR quando for preço normal */}
          {product.additionalInfo && product.isOnSale && (
            <>
              {/* Texto explicativo em bloco transparente */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 12,
                padding: '12px 20px',
                margin: '16px 0 0 32px',
                width: 'calc(100% - 64px)',
                color: textOnDominante,
                fontFamily: poppinsLight,
                fontSize: '1rem',
                lineHeight: 1.3,
                position: 'relative',
                zIndex: 10,
                backdropFilter: 'blur(10px)',
                textAlign: 'left',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}>
                {/* Mostrar texto destacando os valores monetários */}
                {(() => {
                  const text = product.additionalInfo;
                  const parts = text.split(/(R\$\s*[\d,]+(?:\.\d{2})?)/g);
                  
                  return parts.map((part, index) => {
                    // Verifica se é um valor monetário
                    if (/R\$\s*[\d,]+(?:\.\d{2})?/.test(part)) {
                      return (
                        <span 
                          key={index}
                          style={{
                            fontWeight: 'bold',
                            color: '#FFD700', // Dourado bem visível
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            fontFamily: poppinsMedium,
                            fontSize: '1.1rem',
                          }}
                        >
                          {part}
                        </span>
                      );
                    }
                    return part;
                  });
                })()}
              </div>

              {/* Card do valor calculado - alinhado à esquerda com efeito visual */}
              <div style={{
                margin: '12px 0 0 32px',
                width: 'calc(100% - 64px)',
                position: 'relative',
                zIndex: 10,
              }}>
                {/* Texto do título */}
                <div style={{
                  color: textOnDominante,
                  fontFamily: poppinsMedium,
                  fontSize: '1.1rem',
                  lineHeight: 1.4,
                  marginBottom: '8px',
                  textAlign: 'left',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}>
                  {/* Texto dinâmico baseado no tipo de oferta */}
                  {product.displayInfo?.tipo_preco === 'leve_pague' && 'Cada unidade sai por apenas:'}
                  {product.displayInfo?.tipo_preco === 'desconto_segunda_unidade' && 'Valor total das 2 unidades:'}
                  {(product.displayInfo?.tipo_preco === 'de_por' || product.displayInfo?.tipo_preco === 'preco_de_por' || isDePorFormat) && 'Preço promocional:'}
                  {!product.displayInfo?.tipo_preco && 'Valor final:'}
                  {product.displayInfo?.tipo_preco && 
                   !['leve_pague', 'desconto_segunda_unidade', 'de_por', 'preco_de_por', 'POR'].includes(product.displayInfo.tipo_preco) && 
                   'Valor da oferta:'}
                </div>
                
                {/* Card do valor com efeito visual */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #00D084 0%, #00A86B 100%)',
                  borderRadius: 12,
                  padding: '5px 10px',
                  boxShadow: '0 8px 32px rgba(0, 208, 132, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  width: 'fit-content',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Efeito de brilho no fundo - adaptativo */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: getShineEffect('#00D084', 0.25),
                    animation: 'shine 3s ease-in-out infinite',
                    zIndex: 1,
                  }} />
                  
                  <span style={{ 
                    fontSize: '1.4rem', 
                    marginRight: 12,
                    fontFamily: poppinsMedium,
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    position: 'relative',
                    zIndex: 2,
                  }}>
                    R$
                  </span>
                  <span style={{ 
                    fontFamily: bebasNeue, 
                    fontSize: '3.2rem', 
                    fontWeight: 700,
                    lineHeight: 1,
                    textShadow: '0 3px 6px rgba(0,0,0,0.4)',
                    color: 'white',
                    position: 'relative',
                    zIndex: 2,
                  }}>
                    {(() => {
                      // Para tipos de_por, preco_de_por e o novo formato POR, usar salePrice (que já está correto)
                      if (product.displayInfo?.tipo_preco === 'de_por' || product.displayInfo?.tipo_preco === 'preco_de_por' || isDePorFormat) {
                        return product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : '0,00';
                      }
                      // Para outros tipos, extrair do texto como antes
                      const match = product.additionalInfo.match(/R\$\s*([\d,]+(?:\.\d{2})?)/);
                      return match ? match[1].replace('.', ',') : '0,00';
                    })()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Código do produto */}
        <div style={{ 
          fontFamily: poppinsLight, 
          fontSize: '1rem', 
          color: textOnDominante, 
          marginTop: 24, 
          marginLeft: 32, 
          textAlign: 'left',
          position: 'relative',
          zIndex: 10,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          Código: {product.barcode}
        </div>
      </div>
      {/* Lado direito: 50% */}
      <div className="flex flex-col justify-center items-center h-full relative" style={{ background: '#fff', width: '50vw', minHeight: '100vh' }}>
        {imageUrl ? (
          <>
            {/* Indicador de carregamento do cache */}
            {imageLoading && (
              <div className="absolute top-4 right-4 z-20">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-lg px-3 py-2 text-white text-sm">
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Cacheando imagem...</span>
                </div>
              </div>
            )}
            
            {/* Indicador de status offline */}
            {!isOnline && (
              <div className="absolute top-4 left-4 z-20">
                <div className="flex items-center gap-2 bg-red-500/80 backdrop-blur-md rounded-lg px-3 py-2 text-white text-sm">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                  <span>Modo Offline</span>
                </div>
              </div>
            )}

            <img
              src={cachedImageUrl || imageUrl}
              alt={product.name}
              style={{ 
                maxHeight: 378, 
                maxWidth: 378, 
                borderRadius: 0, 
                background: 'transparent', 
                filter: 'drop-shadow(0 16px 48px rgba(0,0,0,0.28))', 
                margin: '0 auto', 
                display: 'block',
                transition: 'opacity 0.3s ease-in-out',
                opacity: imageLoading ? 0.7 : 1
              }}
              onLoad={() => console.log('✅ Imagem carregada:', cachedImageUrl || imageUrl)}
              onError={(e) => {
                console.error('❌ Erro ao carregar imagem:', e);
                // Fallback para imagem original se cache falhar
                if (cachedImageUrl && cachedImageUrl !== imageUrl) {
                  (e.target as HTMLImageElement).src = imageUrl;
                }
              }}
            />
            {/* Paleta de cores */}
            <div className="absolute bottom-8 right-8 bg-black/10 backdrop-blur-md rounded-lg p-4 text-white">
              {cores.dominante && <ColorPalette color={cores.dominante} label="Dominante" />}
              {cores.secundaria && <ColorPalette color={cores.secundaria} label="Secundária" />}
              {cores.terciaria && <ColorPalette color={cores.terciaria} label="Terciária" />}
              {cores.quaternaria && <ColorPalette color={cores.quaternaria} label="Quaternária" />}
          </div>
          </>
        ) : (
          <div className="w-80 h-80 flex items-center justify-center rounded-2xl text-xl font-semibold shadow-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF' }}>Imagem não disponível</div>
        )}
      </div>
    </div>
  );
};

export default ProductLayout1;
