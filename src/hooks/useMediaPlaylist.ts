import { useState, useEffect, useMemo } from 'react';
import { MediaItem } from '../types';
// import { fetchMedias } from '../lib/api/medias'; // REMOVIDO - Não busca mais dados
import { database } from '../lib/firebase';
import { ref, onValue, off } from 'firebase/database';

export const useMediaPlaylist = (initialPlaylist: MediaItem[] = [], options?: { groupId?: string }) => {
  const [playlist, setPlaylist] = useState<MediaItem[]>(initialPlaylist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [useNaturalDuration, setUseNaturalDuration] = useState(false);

  // Efeito para atualizar a playlist interna se a inicial mudar
  useEffect(() => {
    // Transforma a playlist da config para o formato que o player espera
    const formattedPlaylist = initialPlaylist.map((item: any) => {
      // Lógica para encontrar a URL correta e normalizá-la
      let mediaUrl = item.url_download || item.link || item.final || item.url || '';
      if (mediaUrl && mediaUrl.startsWith('//')) {
        mediaUrl = 'https:' + mediaUrl;
      }

      // Se for vídeo, não definimos duration pois usaremos a duração natural do vídeo
      const isVideo = item.type === 'video' || mediaUrl?.includes('.mp4');
      
      return {
        id: item._id || item.id || String(Math.random()),
        type: isVideo ? 'video' : 'image',
        url: mediaUrl,
        duration: isVideo ? undefined : (item.duration || item.time || 8) * 1000,
        title: item.Nome || item.nome || '',
        order: item.order || 1
      };
    });
    setPlaylist(formattedPlaylist);
    setCurrentIndex(0); // Reinicia ao receber nova lista
  }, [initialPlaylist]);

  const currentMedia = useMemo(() => playlist[currentIndex], [playlist, currentIndex]);

  // Efeito para observar mudanças no Firebase
  useEffect(() => {
    // A lógica de atualização via Firebase pode ser reimplementada aqui depois.
    // Por agora, vamos focar em fazer o player funcionar com a lista inicial.
    // Se precisar de atualização em tempo real, podemos reativar isso.
    if (options?.groupId) {
       console.log(`Ouvindo atualizações para o grupo: ${options.groupId}`);
       // const updateRef = ref(database, `updates/${options.groupId}`);
       // onValue(updateRef, ...);
       // return () => off(updateRef);
    }
  }, [options?.groupId]);

  // Timer para trocar de mídia (apenas para imagens)
  useEffect(() => {
    // Se for vídeo ou não tiver duração definida, não usa o timer
    if (!isPlaying || !currentMedia?.duration || playlist.length === 0 || currentMedia.type === 'video') return;

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
    nextMedia: () => setCurrentIndex((prev) => (prev + 1) % playlist.length),
    prevMedia: () => setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length),
    pause: () => setIsPlaying(false),
    play: () => setIsPlaying(true),
  };
};
