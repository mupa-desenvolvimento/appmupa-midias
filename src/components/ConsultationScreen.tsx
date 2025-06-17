
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
  barcode: string;
}

const ConsultationScreen = ({ isActive, onTimeout, layout, barcode }: ConsultationScreenProps) => {
  const { loading, error, getProduct } = useProductData();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (isActive && barcode) {
      console.log('Consultando produto com código:', barcode);
      handleProductLookup(barcode);
    }
  }, [isActive, barcode]);

  useEffect(() => {
    if (isActive && !loading && (product || error)) {
      // Auto return to media after 10 seconds
      const timer = setTimeout(() => {
        onTimeout();
        setProduct(null);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isActive, loading, product, error, onTimeout]);

  const handleProductLookup = async (code: string) => {
    const productData = await getProduct(code);
    setProduct(productData);
  };

  const handleNewScan = () => {
    setProduct(null);
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
      {loading && (
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center space-x-3 text-blue-600">
            <Loader2 className="w-12 h-12 animate-spin" />
            <span className="text-2xl">Buscando produto...</span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="text-center space-y-8">
          <div className="flex items-center justify-center space-x-3 text-red-600 bg-red-50 p-6 rounded-xl">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xl">{error}</span>
          </div>
          <Button 
            onClick={handleNewScan}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-xl rounded-xl"
          >
            Voltar
          </Button>
        </div>
      )}

      {product && !loading && (
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
      )}
    </div>
  );
};

export default ConsultationScreen;
