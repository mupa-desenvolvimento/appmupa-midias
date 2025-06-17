import { useMediaPlaylist } from '../hooks/useMediaPlaylist';
import UpdateNotification from './UpdateNotification';
import { useEffect, useState } from 'react';

interface MediaPlayerProps {
  isActive: boolean;
  mediaId?: string;
  token?: string;
}

const MediaPlayer = ({ isActive, mediaId, token }: MediaPlayerProps) => {
  const { currentMedia, updateMessage } = useMediaPlaylist({ mediaId, token });
  const [progress, setProgress] = useState(100);

  // Resetar e iniciar a barra de progresso quando a mídia muda
  useEffect(() => {
    if (!currentMedia) return;

    setProgress(100);
    const startTime = Date.now();
    const duration = currentMedia.duration;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);
  }, [currentMedia]);

  if (!isActive || !currentMedia) return null;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      {/* Mídia */}
      {currentMedia.type === 'video' ? (
        <video
          src={currentMedia.url}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <img
          src={currentMedia.url}
          alt={currentMedia.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.log('Erro ao carregar imagem:', currentMedia.url);
            e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1920&h=1080&fit=crop';
          }}
        />
      )}

      {/* Barra de Progresso com fundo preto */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black">
        <div
          className="h-full bg-white"
          style={{
            width: `${progress}%`,
            transition: 'width 0.1s linear'
          }}
        />
      </div>

      {/* Notificações de atualização */}
      {updateMessage && <UpdateNotification message={updateMessage} />}
    </div>
  );
};

export default MediaPlayer;
