
import { useState, useEffect } from 'react';
import { Product } from '../types';
import { useBarcodeScan } from '../hooks/useBarcodeScan';
import { useProductData } from '../hooks/useProductData';
import ProductLayout1 from './ProductLayout1';
import ProductLayout2 from './ProductLayout2';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Camera, Package, AlertCircle } from 'lucide-react';

interface ConsultationScreenProps {
  isActive: boolean;
  onTimeout: () => void;
  layout: number;
}

const ConsultationScreen = ({ isActive, onTimeout, layout }: ConsultationScreenProps) => {
  const { isScanning, scannedCode, startScan, resetScan } = useBarcodeScan();
  const { loading, error, getProduct } = useProductData();
  const [product, setProduct] = useState<Product | null>(null);

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
    startScan();
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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      {product ? (
        <div className="w-full max-w-6xl space-y-6">
          {renderProductLayout(product)}
          
          <div className="text-center">
            <Button 
              onClick={handleNewScan}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              <Camera className="w-5 h-5 mr-2" />
              Consultar Outro Produto
            </Button>
          </div>
        </div>
      ) : (
        <Card className="w-full max-w-md bg-white shadow-xl p-8 text-center space-y-6">
          <div className="space-y-4">
            <Package className="w-16 h-16 mx-auto text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Consulta de Preços
            </h2>
            <p className="text-gray-600">
              Escaneie o código de barras do produto para ver o preço
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Buscando produto...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {isScanning && (
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Escaneando...</span>
            </div>
          )}

          <Button 
            onClick={startScan}
            disabled={isScanning || loading}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
          >
            <Camera className="w-5 h-5 mr-2" />
            {isScanning ? 'Escaneando...' : 'Escanear Código de Barras'}
          </Button>

          <p className="text-xs text-gray-500">
            Retorna automaticamente à tela inicial em 30 segundos
          </p>
        </Card>
      )}
    </div>
  );
};

export default ConsultationScreen;
