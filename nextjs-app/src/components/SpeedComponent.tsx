'use client';

import React, { useRef, useState, useCallback } from 'react';

interface SpeedComponentProps {
  onToggle: () => void;
  onSpeedUpdate: (speed: number) => void;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
}

const SpeedComponent: React.FC<SpeedComponentProps> = ({
  onToggle,
  onSpeedUpdate,
  min = 0.5,
  max = 2,
  step = 0.1,
  defaultValue = 1,
}) => {
  const [hasChanged, setHasChanged] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMouseDown = useCallback(() => {
    // Reset change state when mouse is pressed
    setHasChanged(false);
  }, []);

  const handleInput = useCallback((event: React.FormEvent<HTMLInputElement>) => {
    const newValue = parseFloat((event.target as HTMLInputElement).value);
    setHasChanged(true);
    onSpeedUpdate(newValue);
  }, [onSpeedUpdate]);

  const handleClick = useCallback(() => {
    // If clicked but value didn't change (no input event fired), call toggle
    if (!hasChanged && inputRef.current) {
      onToggle();
    }
  }, [onToggle, hasChanged]);

  return (
    <div className="speed-component">
      <input
        ref={inputRef}
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        onMouseDown={handleMouseDown}
        onInput={handleInput}
        onClick={handleClick}
        className="speed-slider"
      />
      <style jsx>{`
        .speed-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #ddd;
          outline: none;
          -webkit-appearance: none;
        }

        .speed-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #007bff;
          cursor: pointer;
        }

        .speed-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #007bff;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default SpeedComponent;