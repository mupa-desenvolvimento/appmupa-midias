import { useState } from 'react';
import { useProductData } from '../hooks/useProductData';
import ProductLayout1 from './ProductLayout1';

export function ProductSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const { loading, error, getProduct } = useProductData();
  const [product, setProduct] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      const result = await getProduct(searchTerm);
      setProduct(result);
    }
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Digite o código de barras do produto..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      {product && (
        <div className="w-full h-[80vh]">
          <ProductLayout1 product={product} />
        </div>
      )}

      {!product && !loading && !error && (
        <p className="text-center text-gray-500">
          Digite um código de barras para buscar o produto.
        </p>
      )}
    </div>
  );
} 