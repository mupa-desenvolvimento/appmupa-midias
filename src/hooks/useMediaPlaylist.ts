
import { useState, useEffect } from 'react';
import { MediaItem } from '../types';

const mockPlaylist: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    url: '/api/placeholder/800/600',
    duration: 5000,
    title: 'Promoções da Semana',
    order: 1
  },
  {
    id: '2',
    type: 'image',
    url: '/api/placeholder/800/600',
    duration: 4000,
    title: 'Novos Produtos',
    order: 2
  },
  {
    id: '3',
    type: 'interactive',
    url: '/api/placeholder/800/600',
    duration: 6000,
    title: 'QR Code - Ofertas Especiais',
    order: 3
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
