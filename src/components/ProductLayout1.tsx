
import { Product } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Calendar, Package } from 'lucide-react';

interface ProductLayout1Props {
  product: Product;
}

const ProductLayout1 = ({ product }: ProductLayout1Props) => {
  return (
    <Card className="w-full max-w-4xl mx-auto bg-gradient-to-br from-white to-blue-50 shadow-2xl overflow-hidden border-0 ring-2 ring-blue-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[500px]">
        {/* Product Image */}
        <div className="relative bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10"></div>
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-w-full max-h-80 object-contain drop-shadow-2xl relative z-10 rounded-lg"
          />
          {product.isOnSale && (
            <Badge className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 text-sm font-bold shadow-lg animate-pulse">
              OFERTA ESPECIAL
            </Badge>
          )}
        </div>

        {/* Product Info */}
        <div className="p-8 flex flex-col justify-center space-y-6 bg-gradient-to-br from-white to-slate-50">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent mb-3">
              {product.name}
            </h1>
            <p className="text-gray-700 text-lg leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Price Section */}
          <div className="space-y-3 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200">
            {product.isOnSale && product.promotionalPrice ? (
              <>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl text-gray-400 line-through">
                    R$ {product.normalPrice.toFixed(2)}
                  </span>
                  <Badge variant="destructive" className="text-xs bg-red-500 hover:bg-red-600">
                    PREÇO ANTERIOR
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
                    R$ {product.promotionalPrice.toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-600">/ {product.unit}</span>
                </div>
                <p className="text-sm text-emerald-700 font-medium bg-emerald-100 px-3 py-1 rounded-full inline-block">
                  Economia: R$ {(product.normalPrice - product.promotionalPrice).toFixed(2)}
                </p>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                  R$ {product.normalPrice.toFixed(2)}
                </span>
                <span className="text-lg text-gray-600">/ {product.unit}</span>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-4 pt-4 border-t-2 border-gradient-to-r from-blue-200 to-purple-200">
            {product.expiryDate && (
              <div className="flex items-center space-x-3 text-gray-700 bg-yellow-50 p-3 rounded-lg">
                <Calendar className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium">Validade: {product.expiryDate}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-3 text-gray-700 bg-blue-50 p-3 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">Código: {product.barcode}</span>
            </div>

            {product.additionalInfo && (
              <div className="flex items-center space-x-3 text-gray-700 bg-green-50 p-3 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">{product.additionalInfo}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProductLayout1;
