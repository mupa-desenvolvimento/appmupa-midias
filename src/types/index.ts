export interface Product {
  id: string;
  barcode: string;
  name: string;
  description: string;
  imageUrl: string;
  normalPrice: number;
  promotionalPrice?: number;
  isOnSale: boolean;
  unit: string;
  expiryDate?: string;
  additionalInfo?: string;
  salePrice?: number | null;
  audioUrl?: string;
  displayInfo?: {
    backgroundColor: string;
    style: string;
    highlightText: string;
    primaryText: string;
    secondaryText: string;
    tipo_preco?: string;
    tipo_oferta?: string;
    dominante?: string;
    secundaria?: string;
    terciaria?: string;
    quaternaria?: string;
  };
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  duration?: number;
  title?: string;
  order: number;
}

export interface AppConfig {
  deviceId: string;
  apiUrl: string;
  activeLayout: number;
  timeoutDuration: number;
  syncInterval: number;
}

export interface Layout {
  id: number;
  name: string;
  type: 'image-left' | 'image-center' | 'image-background' | 'minimal' | 'detailed';
}

export type AppMode = 'media' | 'consultation' | 'config';
