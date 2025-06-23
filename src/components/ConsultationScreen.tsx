import { useState, useEffect } from 'react';
import { Product } from '../types';
import { useProductData } from '../hooks/useProductData';
import { useAudio } from '../contexts/AudioContext';
import { Button } from '@/components/ui/button';
import { Loader2, Package, AlertCircle } from 'lucide-react';
import { extractBrand } from '../lib/utils';
import ProductLayout1 from './ProductLayout1';
import ProductLayout2 from './ProductLayout2';

interface ConsultationScreenProps {
  isActive: boolean;
  onTimeout: () => void;
  barcode: string;
  layout: number;
}

const ConsultationScreen = ({ isActive, onTimeout, barcode, layout }: ConsultationScreenProps) => {
  const { loading, error, getProduct } = useProductData();
  const { waitForAudioEnd, isAudioPlaying, isSpeechPlaying } = useAudio();
  const [product, setProduct] = useState<Product | null>(null);
  const [brand, setBrand] = useState<string | null>(null);

  useEffect(() => {
    if (isActive && barcode) {
      handleProductLookup(barcode);
    }
  }, [isActive, barcode]);

  useEffect(() => {
    if (isActive && !loading && (product || error)) {
      const timer = setTimeout(async () => {
        console.log('⏰ Timeout de 10s atingido, verificando áudio...');
        
        // Aguardar o fim do áudio antes de voltar para a tela de conteúdo
        if (isAudioPlaying || isSpeechPlaying) {
          console.log('🎵 Áudio ainda tocando, aguardando finalizar...');
          await waitForAudioEnd();
          console.log('✅ Áudio finalizado, voltando para tela de conteúdo');
        }
        
        onTimeout();
        setProduct(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isActive, loading, product, error, onTimeout, isAudioPlaying, isSpeechPlaying, waitForAudioEnd]);

  const handleProductLookup = async (code: string) => {
    const productData = await getProduct(code);
    setProduct(productData);
    if (productData) {
      setBrand(extractBrand(productData.name || productData.description || ''));
    }
  };

  const handleNewScan = async () => {
    console.log('🔄 Botão "Voltar" pressionado, verificando áudio...');
    
    // Aguardar o fim do áudio antes de voltar
    if (isAudioPlaying || isSpeechPlaying) {
      console.log('🎵 Áudio ainda tocando, aguardando finalizar...');
      await waitForAudioEnd();
      console.log('✅ Áudio finalizado, voltando para tela de conteúdo');
    }
    
    setProduct(null);
    setBrand(null);
    onTimeout();
  };

  if (!isActive) return null;

  const renderProductLayout = (product: Product) => {
    switch (layout) {
      case 2:
        return <ProductLayout2 product={product} />;
      case 1:
      default:
        return <ProductLayout1 product={product} />;
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-200 flex items-center justify-center p-0 m-0">
      {loading && (
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center space-x-4 text-blue-600 bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl">
            <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
            <span className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Buscando produto...
            </span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center space-x-4 text-red-600 bg-red-50/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-red-200">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <span className="text-2xl font-semibold">{error}</span>
          </div>
          <Button 
            onClick={handleNewScan}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-4 text-xl rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Voltar
          </Button>
        </div>
      )}

      {product && !loading && (
        <div className="w-full h-full flex flex-col items-center justify-center p-0 m-0">
          {renderProductLayout(product)}
        </div>
      )}
    </div>
  );
};

export default ConsultationScreen;
