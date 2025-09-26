'use client';

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';

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
    const [isPlaying, setIsPlaying] = useState(false);

    useImperativeHandle(ref, () => ({
      pause: () => {
        if (audioRef.current) {
          console.log('pausing');
          audioRef.current.pause();
        }
      },
      seek: (time: number) => {
        if (audioRef.current) {
          console.log('seeking');
          audioRef.current.currentTime = time;
        }
      },
      play: () => {
        if (audioRef.current) {
          console.log('playing');
          audioRef.current.play().catch(console.error);
        }
      },
      isPlaying: () => {
        return audioRef.current ? !audioRef.current.paused : false;
      },
      updateSpeed: (speed: number) => {
        if (audioRef.current) {
          console.log('updating speed');
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
        setIsPlaying(false);
        if (onPause) {
          onPause();
        }
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        if (onEnded) {
          onEnded();
        }
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('ended', handleEnded);
      };
    }, [onTimeUpdate, onPause, onEnded]);

    const togglePlayPause = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch(console.error);
        }
      }
    };

    return (
      <>
        <audio ref={audioRef} preload="metadata">
          <source src={url} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
        <button
          onClick={togglePlayPause}
          style={{
            background: '#333',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '10px',
            transition: 'background-color 0.2s ease',
            position: 'absolute',
            top: '92px',
            zIndex: 10
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#555'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            // Pause icon - two vertical bars
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="2" width="3" height="12" fill="white" rx="1"/>
              <rect x="10" y="2" width="3" height="12" fill="white" rx="1"/>
            </svg>
          ) : (
            // Play icon - triangle pointing right
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2L13 8L4 14V2Z" fill="white"/>
            </svg>
          )}
        </button>
      </>
    );
  }
);

AudioComponent.displayName = 'AudioComponent';

export default AudioComponent;