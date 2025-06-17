
import { useMediaPlaylist } from '../hooks/useMediaPlaylist';

interface MediaPlayerProps {
  isActive: boolean;
}

const MediaPlayer = ({ isActive }: MediaPlayerProps) => {
  const { currentMedia } = useMediaPlaylist();

  if (!isActive || !currentMedia) return null;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <img
        src={currentMedia.url}
        alt={currentMedia.title}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default MediaPlayer;
