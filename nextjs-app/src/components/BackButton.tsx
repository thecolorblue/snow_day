'use client';

import { FC } from 'react';

interface BackButtonProps {
  className?: string;
}

const BackButton: FC<BackButtonProps> = ({ className = '' }) => {
  return (
    <button 
      onClick={() => window.history.back()}
      className={`p-2 rounded-full hover:bg-gray-100 ${className}`}
      aria-label="Go back"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
};

export default BackButton;