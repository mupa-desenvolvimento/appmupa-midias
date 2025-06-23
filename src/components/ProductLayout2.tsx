import { useEffect, useState } from 'react';
import { Product } from '../types';
import { getMupaToken, getProductImageAndColors } from '../lib/api/mupaImage';

interface ProductLayout1Props {
  product: Product;
}

const ProductLayout1 = ({ product }: ProductLayout1Props) => {
  const [bgColor, setBgColor] = useState<string>('#FF8C00');
  const [accentColor, setAccentColor] = useState<string>('#FFB347');
  const [darkColor, setDarkColor] = useState<string>('#8B4513');
  const [imageUrl, setImageUrl] = useState<string>(product.imageUrl);

  useEffect(() => {
    let isMounted = true;
    async function fetchImageAndColors() {
      try {
        const t = await getMupaToken();
        if (!isMounted) return;
        const data = await getProductImageAndColors(product.barcode, t);
        if (!isMounted) return;
        if (data.imagem_url) setImageUrl(data.imagem_url.replace(/\\/g, '/'));
        if (data.cores) {
          setBgColor(data.cores.dominante || '#FF8C00');
          setAccentColor(data.cores.secundaria || data.cores.dominante || '#FFB347');
          setDarkColor(data.cores.terciaria || '#8B4513');
        }
      } catch (e) {
        setImageUrl(product.imageUrl);
        setBgColor('#FF8C00');
        setAccentColor('#FFB347');
        setDarkColor('#8B4513');
        console.warn('Erro ao buscar imagem/cores Mupa:', e);
      }
    }
    fetchImageAndColors();
    return () => { isMounted = false; };
  }, [product.barcode, product.imageUrl]);

  const description = (product.description || product.name || '').toUpperCase();
  const descWords = description.split(' ');
  const firstLine = descWords.slice(0, 2).join(' ');
  const secondLine = descWords.slice(2).join(' ');

  const price = product.normalPrice.toFixed(2).replace('.', ',');
  const [reais, centavos] = price.split(',');
  const salePrice = product.salePrice ? product.salePrice.toFixed(2).replace('.', ',') : null;

  const economia = product.salePrice
    ? Math.round(((product.normalPrice - product.salePrice) / product.normalPrice) * 100)
    : null;

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <svg width="100%" height="100%" viewBox="0 0 1440 1024" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accentColor} />
              <stop offset="100%" stopColor={bgColor} />
            </linearGradient>
            <linearGradient id="waveGradientLight" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff22" />
              <stop offset="100%" stopColor="#ffffff00" />
            </linearGradient>
          </defs>
          <path fill="url(#waveGradient)" d="M0,0 L1440,0 L1440,800 Q720,1024 0,800 Z" />
          <path fill="url(#waveGradientLight)" d="M0,700 C400,600 1000,900 1440,700 L1440,1024 L0,1024 Z" opacity="0.3" />
          <path fill="url(#waveGradientLight)" d="M0,750 C300,650 1140,950 1440,780 L1440,1024 L0,1024 Z" opacity="0.2" />
        </svg>
      </div>

      <div className="relative z-10 w-full h-full flex flex-row items-center justify-between p-16">
        <div className="flex flex-col justify-center flex-1 pr-16">
          <div className="mb-4 tracking-wide" style={{ maxWidth: '500px' }}>
            <div className="text-4xl font-bold leading-tight text-white drop-shadow-md">{firstLine}</div>
            {secondLine && (
              <div className="text-2xl font-medium text-white/70 mt-1">{secondLine}</div>
            )}
          </div>
          <div className="inline-block rounded-2xl px-8 py-6 mb-4 shadow-xl" style={{ backgroundColor: darkColor }}>
            <div className="flex items-baseline">
              <span className="text-3xl font-medium text-white mr-2">R$</span>
              <span className="text-7xl font-extrabold text-white leading-none number">{reais}</span>
              <span className="text-3xl font-bold text-white ml-1">,<span className="number">{centavos}</span></span>
            </div>
          </div>
          {product.displayInfo?.tipo_oferta === 'preco_de_por' && salePrice && economia !== null && (
            <div className="rounded-xl bg-white/90 text-orange-900 text-lg font-medium px-6 py-4 shadow-md max-w-xl">
              Produto em oferta! De R$ {product.normalPrice.toFixed(2).replace('.', ',')} por R$ {salePrice}. Economia de {economia}%!
            </div>
          )}
          <div className="text-md mt-8 font-medium text-white/90">Código: {product.barcode}</div>
        </div>
        <div className="relative z-10 flex items-center justify-center flex-shrink-0" style={{ width: '45%' }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              className="object-contain rounded-xl"
              style={{
                maxHeight: '70vh',
                maxWidth: '100%',
                filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.2))'
              }}
            />
          ) : (
            <div className="w-80 h-80 flex items-center justify-center rounded-2xl text-xl font-semibold shadow-2xl bg-white/20 text-white">
              Imagem não disponível
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductLayout1;

