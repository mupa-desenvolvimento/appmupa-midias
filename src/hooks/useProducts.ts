import { useState } from 'react';
import { Product, ProductService, AudioResponse } from '../lib/api/products';

export function useProducts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [audio, setAudio] = useState<AudioResponse | null>(null);

  const searchProductByBarcode = async (barcode: string) => {
    try {
      setLoading(true);
      setError(null);
      const productData = await ProductService.getProductByBarcode(barcode);
      setProduct(productData);
      
      // Buscar áudio do produto
      const audioData = await ProductService.getProductAudio(barcode);
      setAudio(audioData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar produto');
      setProduct(null);
      setAudio(null);
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
    product,
    audio,
    loading,
    error,
    searchProductByBarcode,
    getProductById,
  };
} 