
import { useMediaPlaylist } from '../hooks/useMediaPlaylist';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MediaPlayerProps {
  isActive: boolean;
}

const MediaPlayer = ({ isActive }: MediaPlayerProps) => {
  const { currentMedia, currentIndex, playlist } = useMediaPlaylist();

  if (!isActive || !currentMedia) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full h-full max-w-6xl max-h-4xl bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden">
        <div className="relative w-full h-full flex flex-col">
          {/* Header with branding */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">MUPA Digital</h1>
              <Badge variant="secondary" className="bg-white/20">
                {currentIndex + 1} / {playlist.length}
              </Badge>
            </div>
          </div>

          {/* Media Content */}
          <div className="flex-1 relative overflow-hidden">
            <img
              src={currentMedia.url}
              alt={currentMedia.title}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay with title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <h2 className="text-white text-xl font-semibold">
                {currentMedia.title}
              </h2>
            </div>

            {/* Interactive QR Code overlay for interactive content */}
            {currentMedia.type === 'interactive' && (
              <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg">
                <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-600 text-center">QR Code</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="bg-gray-200 h-1">
            <div 
              className="bg-blue-600 h-full transition-all duration-300 ease-linear"
              style={{
                width: `${((currentIndex + 1) / playlist.length) * 100}%`
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MediaPlayer;
