
import { useMediaPlaylist } from '../hooks/useMediaPlaylist';

interface MediaPlayerProps {
  isActive: boolean;
}

const MediaPlayer = ({ isActive }: MediaPlayerProps) => {
  const { currentMedia } = useMediaPlaylist();

  if (!isActive || !currentMedia) return null;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black">
      <img
        src={currentMedia.url}
        alt={currentMedia.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          console.log('Erro ao carregar imagem:', currentMedia.url);
          e.currentTarget.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1920&h=1080&fit=crop';
        }}
      />
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded">
        {currentMedia.title}
      </div>
    </div>
  );
};

export default MediaPlayer;
