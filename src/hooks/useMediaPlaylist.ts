import { useState, useEffect } from 'react';
import { MediaItem } from '../types';
import { fetchMedias } from '../lib/api/medias';
import { database } from '../lib/firebase';
import { ref, onValue, off } from 'firebase/database';

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

export const useMediaPlaylist = (options?: { mediaId?: string, token?: string }) => {
  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [updateMessage, setUpdateMessage] = useState<string>('');

  const currentMedia = playlist[currentIndex];

  // Função para buscar mídias
  const getMedias = async () => {
    if (!options?.mediaId || !options?.token) return;

    const now = new Date();
    const hour = now.getHours();
    if (hour < 6 || hour > 22) {
      console.log('Fora do horário de atualização de mídias (6h-22h)');
      return;
    }

    try {
      setUpdateMessage('Atualizando lista de mídias...');
      const data = await fetchMedias({ _id: options.mediaId, token: options.token });
      console.log('Resposta da API de mídias:', data);
      
      if (data?.response?.medias && Array.isArray(data.response.medias) && data.response.medias.length > 0) {
        const items: MediaItem[] = data.response.medias.map((item: any) => ({
          id: item._id || item.id || String(Math.random()),
          type: item.type || 'image',
          url: item.link || item.final || item.url,
          duration: (item.time || 8) * 1000,
          title: item.nome || '',
          order: item.order || 1
        }));

        console.log('Items processados:', items);
        setPlaylist(items);
        setCurrentIndex(0);
        setUpdateMessage('Lista de mídias atualizada com sucesso!');
      } else {
        console.log('Nenhuma mídia encontrada na resposta');
        setPlaylist([]);
        setCurrentIndex(0);
        setUpdateMessage('Nenhuma mídia encontrada');
      }
    } catch (err) {
      console.error('Erro ao buscar mídias:', err);
      setPlaylist([]);
      setCurrentIndex(0);
      setUpdateMessage('Erro ao atualizar mídias');
    }
  };

  // Efeito para buscar mídias periodicamente e observar mudanças no Firebase
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let stopped = false;

    // Configurar listener do Firebase
    if (options?.mediaId) {
      const updateRef = ref(database, `updates/${options.mediaId}`);
      onValue(updateRef, (snapshot) => {
        if (!stopped) {
          const data = snapshot.val();
          if (data) {
            console.log('Atualização detectada no Firebase:', data);
            getMedias();
          }
        }
      });
    }

    // Request inicial
    getMedias();

    // Request a cada 1 hora
    intervalId = setInterval(() => {
      if (!stopped) getMedias();
    }, 60 * 60 * 1000);

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
      if (options?.mediaId) {
        const updateRef = ref(database, `updates/${options.mediaId}`);
        off(updateRef);
      }
    };
  }, [options?.mediaId, options?.token]);

  // Timer para trocar de mídia
  useEffect(() => {
    if (!isPlaying || !currentMedia) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playlist.length);
    }, currentMedia.duration);

    return () => clearTimeout(timer);
  }, [currentIndex, isPlaying, currentMedia, playlist.length]);

  return {
    playlist,
    currentMedia,
    currentIndex,
    isPlaying,
    updateMessage,
    nextMedia: () => setCurrentIndex((prev) => (prev + 1) % playlist.length),
    pausePlaylist: () => setIsPlaying(false),
    resumePlaylist: () => setIsPlaying(true),
    setPlaylist
  };
};
