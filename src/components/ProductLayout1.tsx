
import { Product } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Calendar, Package } from 'lucide-react';

interface ProductLayout1Props {
  product: Product;
}

const ProductLayout1 = ({ product }: ProductLayout1Props) => {
  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-2xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[500px]">
        {/* Product Image */}
        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-w-full max-h-80 object-contain drop-shadow-lg"
          />
          {product.isOnSale && (
            <Badge className="absolute top-4 right-4 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 text-sm font-bold">
              OFERTA
            </Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="p-8 flex flex-col justify-center space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price Section */}
          <div className="space-y-2">
            {product.isOnSale && product.promotionalPrice ? (
              <>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl text-gray-400 line-through">
                    R$ {product.normalPrice.toFixed(2)}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    ANTES
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-4xl font-bold text-green-600">
                    R$ {product.promotionalPrice.toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-500">/{product.unit}</span>
                </div>
                <p className="text-sm text-green-600 font-medium">
                  Economia de R$ {(product.normalPrice - product.promotionalPrice).toFixed(2)}
                </p>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-4xl font-bold text-blue-600">
                  R$ {product.normalPrice.toFixed(2)}
                </span>
                <span className="text-lg text-gray-500">/{product.unit}</span>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            {product.expiryDate && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Validade: {product.expiryDate}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-gray-600">
              <Package className="w-4 h-4" />
              <span className="text-sm">Código: {product.barcode}</span>
            </div>

            {product.additionalInfo && (
              <div className="flex items-center space-x-2 text-gray-600">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm">{product.additionalInfo}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProductLayout1;
