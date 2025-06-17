
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
}

export interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'interactive';
  url: string;
  duration: number;
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
