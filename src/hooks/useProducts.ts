import { useState } from 'react';
import { Product, ProductService } from '../lib/api/products';

export function useProducts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const searchProducts = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const results = await ProductService.searchProducts(query);
      setProducts(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar produtos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const getProductById = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const product = await ProductService.getProductById(id);
      return product;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar produto');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    loading,
    error,
    searchProducts,
    getProductById,
  };
} 