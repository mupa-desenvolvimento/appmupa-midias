
import { Product } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductLayout2Props {
  product: Product;
}

const ProductLayout2 = ({ product }: ProductLayout2Props) => {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-white via-blue-50 to-purple-50 shadow-2xl overflow-hidden border-0 ring-2 ring-purple-200">
      <div className="text-center p-8 space-y-6">
        {/* Product Image - Centered */}
        <div className="relative">
          <div className="w-56 h-56 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center p-4 shadow-inner">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-48 h-48 object-contain drop-shadow-lg rounded-lg"
            />
          </div>
          {product.isOnSale && (
            <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 text-sm font-bold animate-pulse shadow-lg">
              SUPER PROMOÇÃO
            </Badge>
          )}
        </div>

        {/* Product Name */}
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
          {product.name}
        </h1>

        {/* Price Section - Large and Centered */}
        <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50 p-8 rounded-2xl border-2 border-gradient-to-r from-emerald-200 to-purple-200 shadow-lg">
          {product.isOnSale && product.promotionalPrice ? (
            <div className="space-y-3">
              <div className="text-lg text-gray-500 line-through">
                De R$ {product.normalPrice.toFixed(2)}
              </div>
              <div className="text-6xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                R$ {product.promotionalPrice.toFixed(2)}
              </div>
              <div className="text-xl bg-gradient-to-r from-emerald-700 to-green-700 bg-clip-text text-transparent font-semibold">
                Você economiza R$ {(product.normalPrice - product.promotionalPrice).toFixed(2)}
              </div>
            </div>
          ) : (
            <div className="text-6xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              R$ {product.normalPrice.toFixed(2)}
            </div>
          )}
          <div className="text-gray-600 mt-3 text-lg">por {product.unit}</div>
        </div>

        {/* Description */}
        <p className="text-lg text-gray-700 max-w-md mx-auto leading-relaxed">
          {product.description}
        </p>

        {/* Additional Info */}
        {product.additionalInfo && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
            <p className="text-blue-800 font-semibold text-lg">{product.additionalInfo}</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProductLayout2;
