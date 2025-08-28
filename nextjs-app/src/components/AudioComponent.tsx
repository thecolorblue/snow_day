'use client';

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

export interface AudioComponentRef {
  pause: () => void;
  seek: (time: number) => void;
  play: () => Promise<void>;
  isPlaying: () => boolean;
  updateSpeed: (speed: number) => void;
}

interface AudioComponentProps {
  url: string;
  onTimeUpdate: (currentTime: number) => void;
  onPause: () => void;
  onEnded: () => void;
}

const AudioComponent = forwardRef<AudioComponentRef, AudioComponentProps>(({
  url,
  onTimeUpdate,
  onPause,
  onEnded,
}, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(audio.currentTime);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded();
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
    };
  }, [onTimeUpdate, onPause, onEnded]);

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

  const play = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const updateSpeed = (speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const getIsPlaying = () => isPlaying;

  useImperativeHandle(ref, () => ({
    pause,
    seek,
    play,
    isPlaying: getIsPlaying,
    updateSpeed,
  }), [isPlaying]);

  return <audio ref={audioRef} src={url} />;
});

export default AudioComponent;