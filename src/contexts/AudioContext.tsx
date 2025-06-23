import React, { createContext, useContext, useState, useRef } from 'react';

interface AudioContextType {
  isAudioPlaying: boolean;
  currentAudio: HTMLAudioElement | null;
  isSpeechPlaying: boolean;
  stopCurrentAudio: () => void;
  setAudioPlaying: (audio: HTMLAudioElement | null) => void;
  setSpeechPlaying: (playing: boolean) => void;
  waitForAudioEnd: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isSpeechPlaying, setIsSpeechPlaying] = useState(false);
  const audioEndPromiseRef = useRef<((value: void) => void) | null>(null);

  const stopCurrentAudio = () => {
    console.log('🛑 Parando áudio atual...');
    
    // Parar síntese de voz
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      console.log('🛑 Síntese de voz cancelada');
    }
    
    // Parar áudio HTML
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      console.log('🛑 Áudio HTML pausado');
    }
    
    setIsAudioPlaying(false);
    setCurrentAudio(null);
    setIsSpeechPlaying(false);
    
    // Resolver promessa se existir
    if (audioEndPromiseRef.current) {
      audioEndPromiseRef.current();
      audioEndPromiseRef.current = null;
    }
  };

  const setSpeechPlaying = (playing: boolean) => {
    console.log('🗣️ Definindo síntese de voz:', playing);
    setIsSpeechPlaying(playing);
    
    if (!playing && audioEndPromiseRef.current) {
      audioEndPromiseRef.current();
      audioEndPromiseRef.current = null;
    }
  };

  const setAudioPlaying = (audio: HTMLAudioElement | null) => {
    console.log('🎵 Definindo áudio atual:', !!audio);
    
    // Parar áudio anterior se existir
    if (currentAudio && currentAudio !== audio) {
      stopCurrentAudio();
    }
    
    setCurrentAudio(audio);
    setIsAudioPlaying(!!audio);
    
    if (audio) {
      // Configurar listeners para detectar fim do áudio
      const handleEnded = () => {
        console.log('🎵 Áudio HTML finalizado');
        setIsAudioPlaying(false);
        setCurrentAudio(null);
        if (audioEndPromiseRef.current) {
          audioEndPromiseRef.current();
          audioEndPromiseRef.current = null;
        }
      };
      
      const handleError = () => {
        console.log('❌ Erro no áudio HTML');
        setIsAudioPlaying(false);
        setCurrentAudio(null);
        if (audioEndPromiseRef.current) {
          audioEndPromiseRef.current();
          audioEndPromiseRef.current = null;
        }
      };
      
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      
      // Cleanup listeners quando áudio mudar
      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  };

  const waitForAudioEnd = (): Promise<void> => {
    return new Promise((resolve) => {
      if (!isAudioPlaying && !isSpeechPlaying) {
        console.log('🎵 Nenhum áudio tocando, resolvendo imediatamente');
        resolve();
        return;
      }
      
      console.log('⏳ Aguardando fim do áudio...');
      audioEndPromiseRef.current = resolve;
      
      // Timeout de segurança (10 segundos)
      setTimeout(() => {
        if (audioEndPromiseRef.current) {
          console.log('⏰ Timeout de áudio atingido, forçando resolução');
          audioEndPromiseRef.current();
          audioEndPromiseRef.current = null;
        }
      }, 10000);
    });
  };

  return (
    <AudioContext.Provider
      value={{
        isAudioPlaying,
        currentAudio,
        isSpeechPlaying,
        stopCurrentAudio,
        setAudioPlaying,
        setSpeechPlaying,
        waitForAudioEnd,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}; 