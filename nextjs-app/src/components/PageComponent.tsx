"use client";

import { useEffect, useRef } from 'react';
import { useQuestions } from './QuestionsContext';

interface PageComponentProps {
  text: string;
  textMap: any[]; // Replace with proper type
  onScroll?: (position: number) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
}

export const PageComponent = ({ 
  text, 
  textMap, 
  onScroll,
  onScrollStart,
  onScrollEnd
}: PageComponentProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { questions, guess } = useQuestions();
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (onScroll) onScroll(container.scrollTop);
    };

    const handleScrollStart = () => {
      if (onScrollStart) onScrollStart();
    };

    const handleScrollEnd = () => {
      if (onScrollEnd) onScrollEnd();
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('scrollstart', handleScrollStart);
    container.addEventListener('scrollend', handleScrollEnd);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scrollstart', handleScrollStart);
      container.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [onScroll, onScrollStart, onScrollEnd]);

  useEffect(() => {
    // Add styles for correct/incorrect answers
    const style = document.createElement('style');
    style.textContent = `
      .word-correct {
        color: #ceeff8;
        text-decoration: underline;
        text-decoration-color: black;
      }
      
      .word-incorrect {
        color: #ff9999;
        text-decoration: underline;
        text-decoration-color: black;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const updateHighlighter = (time: number) => {
    // Implementation for highlighting text based on time
    // This would use the textMap to find current position
  };

  const update = (questionGuess: Record<string, string>) => {
    // Implementation for updating question guesses
  };

  const show = () => {
    // Implementation for showing summary modal
  };

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto p-4 border rounded"
    >
      <div dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
};