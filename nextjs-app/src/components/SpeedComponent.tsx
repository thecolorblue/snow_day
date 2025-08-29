"use client";

import { useState, useRef, useEffect } from 'react';

interface SpeedComponentProps {
  onToggle?: () => void;
  onSpeedUpdate?: (speed: number) => void;
}

export const SpeedComponent = ({ onToggle, onSpeedUpdate }: SpeedComponentProps) => {
  const [speed, setSpeed] = useState<number>(1);
  const rangeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleDragEnd = () => {
      if (onSpeedUpdate) {
        onSpeedUpdate(speed);
      }
    };

    const rangeElement = rangeRef.current;
    if (rangeElement) {
      rangeElement.addEventListener('mouseup', handleDragEnd);
      rangeElement.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      if (rangeElement) {
        rangeElement.removeEventListener('mouseup', handleDragEnd);
        rangeElement.removeEventListener('touchend', handleDragEnd);
      }
    };
  }, [speed, onSpeedUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    // If the value hasn't changed, trigger toggle
    if (e.currentTarget.value === speed.toString()) {
      if (onToggle) onToggle();
    }
  };

  return (
    <input
      type="range"
      ref={rangeRef}
      min="0.5"
      max="2"
      step="0.1"
      value={speed}
      onChange={handleChange}
      onClick={handleClick}
      className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
    />
  );
};