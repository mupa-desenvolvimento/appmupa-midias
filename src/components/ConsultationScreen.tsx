
import { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { useBarcodeScan } from '../hooks/useBarcodeScan';
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
  const { isScanning, scannedCode, resetScan, handleBarcodeScan } = useBarcodeScan();
  const { loading, error, getProduct } = useProductData();
  const [product, setProduct] = useState<Product | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  useEffect(() => {
    if (scannedCode) {
      handleProductLookup(scannedCode);
    }
  }, [scannedCode]);

  const handleProductLookup = async (barcode: string) => {
    const productData = await getProduct(barcode);
    setProduct(productData);
  };

  const handleNewScan = () => {
    resetScan();
    setProduct(null);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length >= 8) { // Códigos de barras geralmente têm 8+ dígitos
      handleBarcodeScan(value);
      e.target.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const value = (e.target as HTMLInputElement).value;
      if (value.length >= 8) {
        handleBarcodeScan(value);
        (e.target as HTMLInputElement).value = '';
      }
    }
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
      {/* Input invisível para captura de código de barras */}
      <input
        ref={inputRef}
        type="text"
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="absolute -left-full opacity-0 pointer-events-none"
        autoFocus
        tabIndex={0}
      />

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
              Escaneie o código de barras do produto
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

          {isScanning && !loading && (
            <div className="flex items-center justify-center space-x-3 text-green-600">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xl">Aguardando código de barras...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConsultationScreen;
