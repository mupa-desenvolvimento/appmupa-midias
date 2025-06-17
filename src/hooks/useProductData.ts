
import { useState } from 'react';
import { Product } from '../types';

const mockProducts: Record<string, Product> = {
  '7891000100103': {
    id: '1',
    barcode: '7891000100103',
    name: 'Coca-Cola Lata 350ml',
    description: 'Refrigerante Coca-Cola Original Lata 350ml',
    imageUrl: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=400&fit=crop',
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
    name: 'Pão Integral 500g',
    description: 'Pão integral com fibras, rico em nutrientes',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    normalPrice: 4.50,
    isOnSale: false,
    unit: 'un',
    expiryDate: '2024-06-20',
    additionalInfo: 'Rico em fibras'
  },
  '7891234567890': {
    id: '3',
    barcode: '7891234567890',
    name: 'Leite Integral 1L',
    description: 'Leite integral pasteurizado tipo A',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    normalPrice: 5.99,
    promotionalPrice: 4.99,
    isOnSale: true,
    unit: 'un',
    expiryDate: '2024-06-25',
    additionalInfo: 'Fonte de cálcio'
  },
  // Código fictício para teste
  '12345678': {
    id: '4',
    barcode: '12345678',
    name: 'Produto Teste',
    description: 'Produto para teste do terminal',
    imageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop',
    normalPrice: 10.00,
    promotionalPrice: 7.99,
    isOnSale: true,
    unit: 'un',
    additionalInfo: 'Produto fictício para demonstração'
  },
  '87654321': {
    id: '5',
    barcode: '87654321',
    name: 'Outro Produto Teste',
    description: 'Segundo produto para teste',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
    normalPrice: 15.50,
    isOnSale: false,
    unit: 'un',
    additionalInfo: 'Segundo produto fictício'
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
