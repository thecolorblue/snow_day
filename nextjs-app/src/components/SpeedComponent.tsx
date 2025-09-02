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

  const handleTouchEnd = (e: React.MouseEvent<HTMLInputElement>) => {
    // Called when touch dragging ends
    if (speed !== previousValueRef.current) {
      onSpeedUpdate(speed);
      previousValueRef.current = speed;
    } else {
      handleClick(e);
    }
  };

  return (
    <div className="speed-component flex items-center gap-2">
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
    </div>
  );
};

export default SpeedComponent;