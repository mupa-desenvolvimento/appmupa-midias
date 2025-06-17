
import { useState, useEffect } from 'react';
import { Product } from '../types';
import { useProductData } from '../hooks/useProductData';
import ProductLayout1 from './ProductLayout1';
import ProductLayout2 from './ProductLayout2';
import { Button } from '@/components/ui/button';
import { Loader2, Package, AlertCircle } from 'lucide-react';

interface ConsultationScreenProps {
  isActive: boolean;
  onTimeout: () => void;
  layout: number;
}

const ConsultationScreen = ({ isActive, onTimeout, layout }: ConsultationScreenProps) => {
  const { loading, error, getProduct } = useProductData();
  const [product, setProduct] = useState<Product | null>(null);
  const [barcode, setBarcode] = useState<string>('');

  useEffect(() => {
    if (isActive) {
      // Get barcode from URL or storage - for now, we'll simulate getting it
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('barcode') || localStorage.getItem('lastBarcode') || '';
      
      if (code) {
        setBarcode(code);
        handleProductLookup(code);
      }
    }
  }, [isActive]);

  useEffect(() => {
    if (isActive && !loading && (product || error)) {
      // Auto return to media after 30 seconds
      const timer = setTimeout(() => {
        onTimeout();
        setProduct(null);
        setBarcode('');
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [isActive, loading, product, error, onTimeout]);

  const handleProductLookup = async (code: string) => {
    const productData = await getProduct(code);
    setProduct(productData);
  };

  const handleNewScan = () => {
    setProduct(null);
    setBarcode('');
    onTimeout();
  };

  const renderProductLayout = (product: Product) => {
    switch (layout) {
      case 2:
        return <ProductLayout2 product={product} />;
      default:
        return <ProductLayout1 product={product} />;
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
      {product ? (
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            {renderProductLayout(product)}
          </div>
          
          <div className="p-8 text-center">
            <Button 
              onClick={handleNewScan}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-xl rounded-xl"
            >
              <Package className="w-6 h-6 mr-3" />
              Consultar Outro Produto
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-8">
          <div className="space-y-6">
            <Package className="w-24 h-24 mx-auto text-blue-600" />
            <h2 className="text-4xl font-bold text-blue-900">
              Consulta de Preços
            </h2>
            <p className="text-xl text-blue-700">
              Aguardando leitura do código de barras...
            </p>
            <p className="text-lg text-blue-600">
              Códigos para teste: 12345678 ou 87654321
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center space-x-3 text-blue-600">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-xl">Buscando produto...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center space-x-3 text-red-600 bg-red-50 p-4 rounded-xl max-w-md mx-auto">
              <AlertCircle className="w-6 h-6" />
              <span className="text-lg">{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsultationScreen;
