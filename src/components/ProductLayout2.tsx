
import { Product } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductLayout2Props {
  product: Product;
}

const ProductLayout2 = ({ product }: ProductLayout2Props) => {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden">
      <div className="text-center p-8 space-y-6">
        {/* Product Image - Centered */}
        <div className="relative">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-48 h-48 mx-auto object-contain drop-shadow-lg"
          />
          {product.isOnSale && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-sm font-bold animate-pulse">
              PROMOÇÃO
            </Badge>
          )}
        </div>

        {/* Product Name */}
        <h1 className="text-3xl font-bold text-gray-900">
          {product.name}
        </h1>

        {/* Price Section - Large and Centered */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg">
          {product.isOnSale && product.promotionalPrice ? (
            <div className="space-y-2">
              <div className="text-lg text-gray-500 line-through">
                De R$ {product.normalPrice.toFixed(2)}
              </div>
              <div className="text-5xl font-bold text-green-600">
                R$ {product.promotionalPrice.toFixed(2)}
              </div>
              <div className="text-xl text-green-600 font-medium">
                Você economiza R$ {(product.normalPrice - product.promotionalPrice).toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-5xl font-bold text-blue-600">
              R$ {product.normalPrice.toFixed(2)}
            </div>
          )}
          <div className="text-gray-500 mt-2">por {product.unit}</div>
        </div>

        {/* Description */}
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          {product.description}
        </p>

        {/* Additional Info */}
        {product.additionalInfo && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 font-medium">{product.additionalInfo}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProductLayout2;
