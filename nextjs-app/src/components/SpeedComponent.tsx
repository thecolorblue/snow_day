'use client';

import React, { useState, useRef } from 'react';

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
  max = 2.0,
  step = 0.1,
  defaultValue = 1.0
}) => {
  const [speed, setSpeed] = useState(defaultValue);
  const previousValueRef = useRef(defaultValue);

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    // Check if the value hasn't changed (clicked but not dragged)
    if (speed === previousValueRef.current) {
      onToggle();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);
  };

  const handleMouseUp = () => {
    // Called when dragging ends
    if (speed !== previousValueRef.current) {
      onSpeedUpdate(speed);
      previousValueRef.current = speed;
    }
  };

  const handleTouchEnd = () => {
    // Called when touch dragging ends
    if (speed !== previousValueRef.current) {
      onSpeedUpdate(speed);
      previousValueRef.current = speed;
    }
  };

  return (
    <div className="speed-component flex items-center gap-2">
      <span className="text-sm text-gray-600">{min}x</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={speed}
        onClick={handleClick}
        onChange={handleChange}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <span className="text-sm text-gray-600">{max}x</span>
      <span className="text-sm font-medium min-w-[3rem]">{speed.toFixed(1)}x</span>
    </div>
  );
};

export default SpeedComponent;