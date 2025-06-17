
import { Product } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductLayout2Props {
  product: Product;
}

const ProductLayout2 = ({ product }: ProductLayout2Props) => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card className="w-full max-w-4xl mx-auto bg-white shadow-2xl overflow-hidden border-0 rounded-3xl">
        <div className="flex flex-row h-full min-h-[600px]">
          {/* Lado esquerdo - Imagem */}
          <div className="w-1/2 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-12 relative">
            {product.isOnSale && (
              <Badge className="absolute top-6 left-6 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-3 text-lg font-bold animate-pulse shadow-lg rounded-full">
                PROMOÇÃO
              </Badge>
            )}
            <div className="relative">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="object-contain shadow-2xl rounded-2xl"
                style={{ 
                  maxHeight: '400px',
                  maxWidth: '100%',
                  filter: 'drop-shadow(8px 8px 20px rgba(0,0,0,0.2))'
                }}
              />
            </div>
          </div>

          {/* Lado direito - Informações */}
          <div className="w-1/2 flex flex-col justify-center p-12 space-y-8">
            {/* Nome do produto */}
            <h1 className="text-4xl font-black leading-tight text-gray-900 tracking-tight">
              {product.name.toUpperCase()}
            </h1>

            {/* Preço - Grande e destacado */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-8 rounded-2xl shadow-xl">
              {product.isOnSale && product.promotionalPrice ? (
                <div className="space-y-3">
                  <div className="text-xl text-white/80 line-through font-medium">
                    De R$ {product.normalPrice.toFixed(2).replace('.', ',')}
                  </div>
                  <div className="text-6xl font-black text-white leading-none">
                    R$ {product.promotionalPrice.toFixed(2).replace('.', ',')}
                  </div>
                  <div className="text-xl text-white font-semibold">
                    Economia: R$ {(product.normalPrice - product.promotionalPrice).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              ) : (
                <div className="text-6xl font-black text-white leading-none">
                  R$ {product.normalPrice.toFixed(2).replace('.', ',')}
                </div>
              )}
              <div className="text-white/90 mt-3 text-xl font-medium">por {product.unit}</div>
            </div>

            {/* Descrição */}
            <p className="text-xl text-gray-700 leading-relaxed font-medium">
              {product.description}
            </p>

            {/* Informações adicionais */}
            {product.additionalInfo && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                <p className="text-blue-800 font-semibold text-lg">{product.additionalInfo}</p>
              </div>
            )}

            {/* Código de barras */}
            <div className="text-gray-600 text-lg font-medium">
              Código: {product.barcode}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProductLayout2;
