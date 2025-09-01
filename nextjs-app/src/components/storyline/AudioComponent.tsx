'use client'
import React, { useRef, useEffect } from 'react';

class AudioPlayer {
  private audio: HTMLAudioElement;
  private onTimeUpdateCallback: (time: number) => void;
  private onPauseCallback: () => void;
  private onEndedCallback: () => void;

  constructor(url: string, onTimeUpdate: (time: number) => void, onPause: () => void, onEnded: () => void) {
    this.audio = new Audio(url);
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onPauseCallback = onPause;
    this.onEndedCallback = onEnded;

    this.audio.addEventListener('timeupdate', () => this.onTimeUpdateCallback(this.audio.currentTime));
    this.audio.addEventListener('pause', () => this.onPauseCallback());
    this.audio.addEventListener('ended', () => this.onEndedCallback());
  }

  pause() {
    this.audio.pause();
  }

  seek(time: number) {
    this.audio.currentTime = time;
  }

  play() {
    this.audio.play();
  }

  isPlaying() {
    return !this.audio.paused;
  }

  updateSpeed(speed: number) {
    this.audio.playbackRate = speed;
  }
}

interface AudioComponentProps {
  url: string;
  onTimeUpdate: (time: number) => void;
  onPause: () => void;
  onEnded: () => void;
  controller: (controller: AudioPlayer) => void;
}

const AudioComponent: React.FC<AudioComponentProps> = ({ url, onTimeUpdate, onPause, onEnded, controller }) => {
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    const player = new AudioPlayer(url, onTimeUpdate, onPause, onEnded);
    playerRef.current = player;
    controller(player);

    // Cleanup
    return () => {
      player.pause();
    };
  }, [url, onTimeUpdate, onPause, onEnded, controller]);

  return null; // This component does not render anything
};

export default AudioComponent;
export { AudioPlayer };