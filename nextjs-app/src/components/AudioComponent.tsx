"use client";

import { useEffect, useRef } from 'react';

interface AudioComponentProps {
  url: string;
  onTimeUpdate?: (time: number) => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export const AudioComponent = ({ url, onTimeUpdate, onPause, onEnded }: AudioComponentProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set the source when url changes
    audio.src = url;
    
    const handleTimeUpdate = () => {
      if (onTimeUpdate && audio.currentTime !== undefined) {
        onTimeUpdate(audio.currentTime);
      }
    };

    const handlePause = () => {
      if (onPause) onPause();
    };

    const handleEnded = () => {
      if (onEnded) onEnded();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [url, onTimeUpdate, onPause, onEnded]);

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const play = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const isPlaying = () => {
    if (audioRef.current) {
      return !audioRef.current.paused && !audioRef.current.ended;
    }
    return false;
  };

  const updateSpeed = (speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  return <audio ref={audioRef} />;
};