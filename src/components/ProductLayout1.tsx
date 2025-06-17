import { useEffect, useState } from 'react';
import { Product } from '../types';
import { getMupaToken, getProductImageAndColors } from '../lib/api/mupaImage';

interface ProductLayout1Props {
  product: Product;
}

const ProductLayout1 = ({ product }: ProductLayout1Props) => {
  const [bgColor, setBgColor] = useState<string>('#f5a623');
  const [accentColor, setAccentColor] = useState<string>('#eab308');
  const [darkColor, setDarkColor] = useState<string>('#3a2200');
  const [gradient, setGradient] = useState<string>('');
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
          setDarkColor(data.cores[data.cores.length - 1] || '#3a2200');
          // Monta um degradê bonito usando as duas primeiras cores
          setGradient(`linear-gradient(120deg, ${data.cores[0]} 60%, ${data.cores[1] || data.cores[0]} 100%)`);
        }
      } catch (e) {
        setImageUrl(product.imageUrl);
        setBgColor('#f5a623');
        setAccentColor('#eab308');
        setDarkColor('#3a2200');
        setGradient('linear-gradient(120deg, #f5a623 60%, #eab308 100%)');
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
    <div className="w-full h-full flex flex-row items-stretch p-0 rounded-none shadow-none border-0 overflow-hidden" style={{ background: gradient || bgColor }}>
      {/* Área de informações */}
      <div className="flex flex-col justify-center p-16 gap-8 min-w-0 w-1/2">
        {/* Descrição grande */}
        <div className="text-4xl font-extrabold leading-tight text-white mb-8" style={{ textShadow: 'none', letterSpacing: 1, lineHeight: 1.1 }}>
          {description}
        </div>
        {/* Preço destacado */}
        <div
          className="inline-block px-12 py-6 rounded-2xl mb-8"
          style={{ background: darkColor, color: '#fff', minWidth: 340, textAlign: 'left' }}
        >
          <span className="text-3xl align-top font-light mr-2" style={{ verticalAlign: 'top' }}>R$</span>
          <span className="text-8xl font-extrabold align-middle leading-none" style={{ verticalAlign: 'middle' }}>{reais}</span>
          <span className="text-3xl font-bold align-baseline ml-1" style={{ verticalAlign: 'baseline' }}>,{centavos}</span>
        </div>
        {/* Código */}
        <div className="text-lg text-white/80 mt-8">Código: {product.barcode}</div>
      </div>
      {/* Área da imagem */}
      <div className="flex items-center justify-center flex-shrink-0 w-1/2 h-full min-h-[400px] bg-transparent">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="object-contain max-h-[80vh] max-w-[90%] mx-auto bg-transparent"
            style={{ background: 'transparent', display: 'block', margin: '0 auto' }}
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-gray-200 rounded-2xl text-gray-400 text-xl">
            Imagem não disponível
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductLayout1;
