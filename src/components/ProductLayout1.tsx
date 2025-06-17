
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
        if (data.cores && data.cores.length > 0) {
          setBgColor(data.cores[0]);
          setAccentColor(data.cores[1] || data.cores[0]);
          setDarkColor(data.cores[data.cores.length - 1] || '#8B4513');
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

  // Descrição em caixa alta
  const description = (product.description || product.name || '').toUpperCase();

  // Preço formatado
  const price = product.normalPrice.toFixed(2).replace('.', ',');
  const [reais, centavos] = price.split(',');

  return (
    <div 
      className="w-full h-full flex flex-row items-center justify-between p-16 overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Área de informações à esquerda */}
      <div className="flex flex-col justify-center flex-1 pr-16">
        {/* Descrição grande */}
        <div 
          className="text-5xl font-black leading-tight mb-12 tracking-wider"
          style={{ 
            color: '#FFFFFF',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            lineHeight: '1.1',
            maxWidth: '600px'
          }}
        >
          {description}
        </div>
        
        {/* Preço destacado */}
        <div
          className="inline-block rounded-2xl px-8 py-6 shadow-2xl"
          style={{ 
            backgroundColor: darkColor,
            maxWidth: 'fit-content'
          }}
        >
          <div className="flex items-baseline">
            <span 
              className="text-3xl font-medium mr-2"
              style={{ color: '#FFFFFF' }}
            >
              R$
            </span>
            <span 
              className="text-8xl font-black leading-none"
              style={{ color: '#FFFFFF' }}
            >
              {reais}
            </span>
            <span 
              className="text-4xl font-bold ml-1"
              style={{ color: '#FFFFFF' }}
            >
              ,{centavos}
            </span>
          </div>
        </div>
        
        {/* Código */}
        <div 
          className="text-lg mt-8 font-medium"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          Código: {product.barcode}
        </div>
      </div>

      {/* Área da imagem à direita */}
      <div className="flex items-center justify-center flex-shrink-0" style={{ width: '45%' }}>
        {imageUrl ? (
          <div className="relative">
            <img
              src={imageUrl}
              alt={product.name}
              className="object-contain shadow-2xl rounded-xl"
              style={{ 
                maxHeight: '70vh',
                maxWidth: '100%',
                filter: 'drop-shadow(4px 4px 12px rgba(0,0,0,0.3))'
              }}
            />
          </div>
        ) : (
          <div 
            className="w-80 h-80 flex items-center justify-center rounded-2xl text-xl font-semibold shadow-2xl"
            style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#FFFFFF'
            }}
          >
            Imagem não disponível
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductLayout1;
