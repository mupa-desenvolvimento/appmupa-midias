
import { useState, useEffect } from 'react';
import { MediaItem } from '../types';

const mockPlaylist: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=1920&h=1080&fit=crop',
    duration: 5000,
    title: 'Padaria - Pães Frescos',
    order: 1
  },
  {
    id: '2',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1920&h=1080&fit=crop',
    duration: 4000,
    title: 'Produtos Alimentícios',
    order: 2
  },
  {
    id: '3',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=1920&h=1080&fit=crop',
    duration: 6000,
    title: 'Açougue - Carnes Frescas',
    order: 3
  },
  {
    id: '4',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1920&h=1080&fit=crop',
    duration: 5000,
    title: 'Hortifruti - Frutas Frescas',
    order: 4
  },
  {
    id: '5',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1920&h=1080&fit=crop',
    duration: 4000,
    title: 'Variedade de Produtos',
    order: 5
  }
];

export const useMediaPlaylist = () => {
  const [playlist, setPlaylist] = useState<MediaItem[]>(mockPlaylist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const currentMedia = playlist[currentIndex];

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };

  const pausePlaylist = () => {
    setIsPlaying(false);
  };

  const resumePlaylist = () => {
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying || !currentMedia) return;

    const timer = setTimeout(() => {
      nextMedia();
    }, currentMedia.duration);

    return () => clearTimeout(timer);
  }, [currentIndex, isPlaying, currentMedia]);

  return {
    playlist,
    currentMedia,
    currentIndex,
    isPlaying,
    nextMedia,
    pausePlaylist,
    resumePlaylist,
    setPlaylist
  };
};
