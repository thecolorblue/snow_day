'use client'
import React, { useState, useRef } from 'react';

interface SpeedComponentProps {
  onToggle: () => void;
  onSpeedUpdate: (speed: number) => void;
}

const SpeedComponent: React.FC<SpeedComponentProps> = ({ onToggle, onSpeedUpdate }) => {
  const [speed, setSpeed] = useState(1);
  const rangeRef = useRef<HTMLInputElement>(null);

  const handleMouseUp = () => {
    if (rangeRef.current) {
      const currentValue = parseFloat(rangeRef.current.value);
      if (currentValue === speed) {
        onToggle();
      }
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(event.target.value);
    setSpeed(newSpeed);
    onSpeedUpdate(newSpeed);
  };

  return (
    <div className="speed-control">
      <input
        ref={rangeRef}
        type="range"
        min="0.5"
        max="2"
        step="0.1"
        value={speed}
        onMouseUp={handleMouseUp}
        onChange={handleChange}
      />
      <span>{speed.toFixed(1)}x</span>
    </div>
  );
};

export default SpeedComponent;