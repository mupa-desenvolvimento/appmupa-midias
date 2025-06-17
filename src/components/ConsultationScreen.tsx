
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
    console.log('Renderizando layout:', layout);
    switch (layout) {
      case 2:
        return <ProductLayout2 product={product} />;
      case 1:
      default:
        return <ProductLayout1 product={product} />;
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 flex items-center justify-center">
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
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center p-4">
            {renderProductLayout(product)}
          </div>
          
          <div className="p-8 text-center">
            <Button 
              onClick={handleNewScan}
              size="lg"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-12 py-4 text-xl rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
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
