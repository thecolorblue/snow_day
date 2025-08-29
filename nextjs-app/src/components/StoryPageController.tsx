"use client";

import { useState, useEffect } from 'react';
import { AudioComponent } from './AudioComponent';
import { SpeedComponent } from './SpeedComponent';
import { SummaryComponent } from './SummaryComponent';
import { PageComponent } from './PageComponent';
import { QuestionsProvider, useQuestions } from './QuestionsContext';

interface StoryPageControllerProps {
  storylineId: number;
  storylineStep: number;
  storyHtml: string;
  storyAudio: string | null;
  questions: any[]; // Replace with proper type
  wordList: any[]; // Replace with proper type
}

const StoryPageControllerInternal = ({ 
  storylineId, 
  storylineStep, 
  storyHtml, 
  storyAudio, 
  questions,
  wordList
}: StoryPageControllerProps) => {
  const { setQuestions, allQuestionsCompleted } = useQuestions();
  const [audioUrl, setAudioUrl] = useState<string | null>(storyAudio);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(1);
  const [questionGuesses, setQuestionGuesses] = useState<Record<string, string>>({});
  const [summaryVisible, setSummaryVisible] = useState<boolean>(false);
  
  // Initialize questions in context
  useEffect(() => {
    // Only update if we have questions to set
    if (questions && questions.length > 0) {
      setQuestions(questions, (questionId: string, guess: string) => {
        // Handle question guess callback
        setQuestionGuesses(prev => ({ ...prev, [questionId]: guess }));
      });
    }
  }, [questions, setQuestions]);

  // Audio event handlers
  const handleAudioTimeUpdate = (time: number) => {
    // In a real implementation, we would call page component methods
  };

  const handleAudioPause = () => {
    setIsPlaying(false);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Speed component handlers
  const handleSpeedToggle = () => {
    // In a real implementation, we would control audio playback
  };

  const handleSpeedUpdate = (speed: number) => {
    setCurrentSpeed(speed);
    // In a real implementation, we would update audio speed
  };

  // Page component handlers
  const handlePageScroll = (position: number) => {
    // In a real implementation, we would control audio seeking
  };

  const handlePageScrollStart = () => {
    // In a real implementation, we would pause audio
  };

  const handlePageScrollEnd = () => {
    // In a real implementation, we would resume audio
  };

  // Question handling
  const handleQuestionGuess = (questionId: string, guess: string) => {
    // Update question guesses
    setQuestionGuesses(prev => ({ ...prev, [questionId]: guess }));
    
    // Check if all questions are completed
    if (allQuestionsCompleted()) {
      setSummaryVisible(true);
    }
  };

  // Summary component handlers
  const handleSummaryUpdate = (guesses: Record<string, string>) => {
    setQuestionGuesses(prev => ({ ...prev, ...guesses }));
  };

  const handleSummaryShow = () => {
    setSummaryVisible(true);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Audio Player */}
      {audioUrl && (
        <div className="p-4 border-b">
          <AudioComponent
            url={audioUrl}
            onTimeUpdate={handleAudioTimeUpdate}
            onPause={handleAudioPause}
            onEnded={handleAudioEnded}
          />
        </div>
      )}

      {/* Speed Control */}
      <div className="p-4 border-b">
        <SpeedComponent
          onToggle={handleSpeedToggle}
          onSpeedUpdate={handleSpeedUpdate}
        />
        <span className="ml-2">{currentSpeed}x</span>
      </div>

      {/* Story Content */}
      <div className="flex-1 overflow-hidden">
        <PageComponent
          text={storyHtml}
          textMap={wordList}
          onScroll={handlePageScroll}
          onScrollStart={handlePageScrollStart}
          onScrollEnd={handlePageScrollEnd}
        />
      </div>

      {/* Summary Modal */}
      {summaryVisible && (
        <SummaryComponent
          questions={questions}
          guesses={questionGuesses}
        />
      )}
    </div>
  );
};

export const StoryPageController = (props: StoryPageControllerProps) => {
  return (
    <QuestionsProvider>
      <StoryPageControllerInternal {...props} />
    </QuestionsProvider>
  );
};