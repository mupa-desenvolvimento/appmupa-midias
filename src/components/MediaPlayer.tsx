import { useMediaPlaylist } from '../hooks/useMediaPlaylist';
import { MediaItem } from '../types';
import { useEffect, useState } from 'react';
import { useMediaCache } from '../hooks/useMediaCache';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { cn } from '@/lib/utils';

interface MediaPlayerProps {
  isActive: boolean;
  playlist: MediaItem[];
  groupId?: string;
  deviceSerial: string;
}

// Sub-componente para renderizar uma única instância de mídia (imagem ou vídeo)
const MediaElement = ({ 
  media, 
  cachedUrl, 
  isLoading, 
  isActive,
  onVideoEnded 
}: { 
  media: MediaItem | null, 
  cachedUrl: string | null, 
  isLoading: boolean, 
  isActive: boolean,
  onVideoEnded?: () => void 
}) => {
  if (!media) return null;

  return (
    <div className={cn(
      "absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out",
      isActive ? "opacity-100" : "opacity-0"
    )}>
      {media.type === 'video' ? (
        <video
          key={cachedUrl || media.url}
          src={cachedUrl || media.url}
          className="w-full h-full object-cover"
          poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}
          autoPlay
          muted
          playsInline
          onEnded={onVideoEnded}
        />
      ) : (
        <img
          key={cachedUrl || media.url}
          src={cachedUrl || media.url}
          alt={media.title}
          className="w-full h-full object-cover"
          style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}
        />
      )}
    </div>
  );
};

const MediaPlayer = ({ isActive, playlist, groupId, deviceSerial }: MediaPlayerProps) => {
  const { currentMedia, nextMedia } = useMediaPlaylist(playlist, { groupId });
  const { updateStatus } = useDeviceStatus(deviceSerial);
  
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
  const [mediaA, setMediaA] = useState<MediaItem | null>(null);
  const [mediaB, setMediaB] = useState<MediaItem | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date>(new Date());

  const { cachedUrl: cachedUrlA, isLoading: isLoadingA } = useMediaCache(mediaA?.url || null, mediaA?.type || 'image');
  const { cachedUrl: cachedUrlB, isLoading: isLoadingB } = useMediaCache(mediaB?.url || null, mediaB?.type || 'image');

  // Atualiza o status do dispositivo quando a mídia muda
  useEffect(() => {
    if (currentMedia) {
      updateStatus('online');
      setLastHeartbeat(new Date());
    }
  }, [currentMedia, updateStatus]);

  // Monitora o status do dispositivo
  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const timeSinceLastHeartbeat = now.getTime() - lastHeartbeat.getTime();
      
      // Se não houver atualização por mais de 30 segundos, marca como offline
      if (timeSinceLastHeartbeat > 30000) {
        updateStatus('offline');
      }
    };

    const interval = setInterval(checkStatus, 10000); // Verifica a cada 10 segundos

    return () => clearInterval(interval);
  }, [lastHeartbeat, updateStatus]);

  // Carrega a mídia no player inativo
  useEffect(() => {
    if (!currentMedia) return;

    if (activePlayer === 'A') {
      setMediaB(currentMedia);
    } else {
      setMediaA(currentMedia);
    }
  }, [currentMedia]);

  // Troca o player ativo quando a mídia do player inativo terminar de carregar
  useEffect(() => {
    if (activePlayer === 'A' && !isLoadingB && mediaB) {
      setActivePlayer('B');
    } else if (activePlayer === 'B' && !isLoadingA && mediaA) {
      setActivePlayer('A');
    }
  }, [isLoadingA, isLoadingB]);

  // Inicializa o primeiro player
  useEffect(() => {
    if (playlist.length > 0 && !mediaA && !mediaB) {
      setMediaA(playlist[0]);
    }
  }, [playlist, mediaA, mediaB]);

  const displayMedia = activePlayer === 'A' ? mediaA : mediaB;
  
  if (!isActive) return null;
  if (!displayMedia) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black text-white text-2xl font-bold">
        Aguardando conteúdo...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      {/* Container para os dois players */}
      <div className="relative w-full h-full">
        <MediaElement 
          media={mediaA} 
          cachedUrl={cachedUrlA} 
          isLoading={isLoadingA} 
          isActive={activePlayer === 'A'} 
          onVideoEnded={() => {
            nextMedia();
            updateStatus('online');
            setLastHeartbeat(new Date());
          }}
        />
        <MediaElement 
          media={mediaB} 
          cachedUrl={cachedUrlB} 
          isLoading={isLoadingB} 
          isActive={activePlayer === 'B'} 
          onVideoEnded={() => {
            nextMedia();
            updateStatus('online');
            setLastHeartbeat(new Date());
          }}
        />
      </div>

      {/* Indicador de status (opcional, pode ser adaptado para o media ativo) */}
      {/* ... (código dos indicadores de status como online/offline/erro pode ser adicionado aqui se necessário) ... */}
    </div>
  );
};

export default MediaPlayer;
