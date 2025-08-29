'use client';

import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface AudioComponentProps {
  url: string;
  onTimeUpdate?: (time: number) => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export interface AudioComponentRef {
  pause: () => void;
  seek: (time: number) => void;
  play: () => void;
  isPlaying: () => boolean;
  updateSpeed: (speed: number) => void;
}

const AudioComponent = forwardRef<AudioComponentRef, AudioComponentProps>(
  ({ url, onTimeUpdate, onPause, onEnded }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useImperativeHandle(ref, () => ({
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      },
      seek: (time: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
        }
      },
      play: () => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.error);
        }
      },
      isPlaying: () => {
        return audioRef.current ? !audioRef.current.paused : false;
      },
      updateSpeed: (speed: number) => {
        if (audioRef.current) {
          audioRef.current.playbackRate = speed;
        }
      }
    }));

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleTimeUpdate = () => {
        if (onTimeUpdate) {
          onTimeUpdate(audio.currentTime);
        }
      };

      const handlePause = () => {
        if (onPause) {
          onPause();
        }
      };

      const handleEnded = () => {
        if (onEnded) {
          onEnded();
        }
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('ended', handleEnded);
      };
    }, [onTimeUpdate, onPause, onEnded]);

    return (
      <audio ref={audioRef} preload="metadata">
        <source src={url} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    );
  }
);

AudioComponent.displayName = 'AudioComponent';

export default AudioComponent;