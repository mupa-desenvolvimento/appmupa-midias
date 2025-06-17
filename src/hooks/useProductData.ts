
import { useState } from 'react';
import { Product } from '../types';

const mockProducts: Record<string, Product> = {
  '7891000100103': {
    id: '1',
    barcode: '7891000100103',
    name: 'Coca-Cola Lata 350ml',
    description: 'Refrigerante Coca-Cola Original Lata 350ml',
    imageUrl: '/api/placeholder/300/300',
    normalPrice: 3.50,
    promotionalPrice: 2.99,
    isOnSale: true,
    unit: 'un',
    expiryDate: '2024-12-31',
    additionalInfo: 'Gelada e refrescante'
  },
  '1234567890123': {
    id: '2',
    barcode: '1234567890123',
    name: 'Pão de Açúcar Integral',
    description: 'Pão integral com fibras, 500g',
    imageUrl: '/api/placeholder/300/300',
    normalPrice: 4.50,
    isOnSale: false,
    unit: 'un',
    expiryDate: '2024-06-20',
    additionalInfo: 'Rico em fibras'
  }
};

export const useProductData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProduct = async (barcode: string): Promise<Product | null> => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const product = mockProducts[barcode];
      
      if (!product) {
        setError('Produto não encontrado');
        return null;
      }

      return product;
    } catch (err) {
      setError('Erro ao consultar produto');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getProduct
  };
};
