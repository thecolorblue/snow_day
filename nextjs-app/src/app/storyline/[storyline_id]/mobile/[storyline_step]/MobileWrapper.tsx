'use client';

import React from 'react';
import MobileStoryView from '@/components/MobileStoryView';

interface MobileWrapperProps {
  storylineId: number;
  storylineStep: number;
  textMap: any[]; // StoryMap from mobile page
  storyAudio: string | null;
  storyHtml: string;
}

const MobileWrapper: React.FC<MobileWrapperProps> = ({
  storylineId,
  storylineStep,
  textMap,
  storyAudio,
  storyHtml,
}) => {
  const handleGuess = (question: string, guess: string, isCorrect: boolean) => {
    console.log('Question guessed:', question, guess, isCorrect);
    // Here you can add logic to save progress, send to server, etc.
  };

  return (
    <MobileStoryView
      storylineId={storylineId}
      storylineStep={storylineStep}
      textMap={textMap}
      storyAudio={storyAudio}
      storyHtml={storyHtml}
      onGuess={handleGuess}
    />
  );
};

export default MobileWrapper;