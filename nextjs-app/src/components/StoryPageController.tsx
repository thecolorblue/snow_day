'use client';

import React, { useRef, useEffect } from 'react';
import AudioComponent, { AudioComponentRef } from './AudioComponent';
import SpeedComponent from './SpeedComponent';
import SummaryComponent, { SummaryComponentRef } from './SummaryComponent';
import PageComponent, { PageComponentRef, StoryMapWord } from './PageComponent';
import { QuestionsProvider, useQuestionController } from './QuestionsContext';

// Local Question type definition to avoid import issues
interface Question {
  id: number;
  type: string;
  question: string;
  key: string;
  correct: string;
  answers: string | null;
  classroom: string;
}

interface StoryPageControllerProps {
  storyHtml: string;
  storyAudio: string | null;
  textMap: StoryMapWord[];
  questions: Question[];
}

const StoryPageControllerInner: React.FC<StoryPageControllerProps> = ({
  storyHtml,
  storyAudio,
  textMap,
  questions
}) => {
  const audioRef = useRef<AudioComponentRef>(null);
  const summaryRef = useRef<SummaryComponentRef>(null);
  const pageRef = useRef<PageComponentRef>(null);
  const questionController = useQuestionController();

  useEffect(() => {
    setupListeners();
  }, []);

  const setupListeners = () => {
    // Set up questions in the controller
    questionController.setQuestions(questions, handleGuess);
  };

  const handleSpeedUpdate = (speed: number) => {
    audioRef.current?.updateSpeed(speed);
  };

  const handleToggle = () => {
    if (audioRef.current?.isPlaying()) {
      audioRef.current.pause();
    } else {
      audioRef.current?.play();
    }
  };

  const handleTimeUpdate = (time: number) => {
    pageRef.current?.updateHighlighter(time);
  };

  const handleGuess = (questionId: number, isCorrect: boolean) => {
    // Find the question details
    const question = questions.find(q => q.id === questionId);
    const questionStatus = questionController.getQuestions().find(q => q.id === questionId);
    
    if (question && questionStatus) {
      summaryRef.current?.update({
        questionId,
        question: question.question,
        userAnswer: questionStatus.userAnswer || '',
        correctAnswer: question.correct,
        isCorrect
      });

      // Show summary if all questions are completed
      if (questionController.allQuestionsCompleted()) {
        summaryRef.current?.show();
      }
    }
  };

  const handleScrollStart = () => {
    audioRef.current?.pause();
  };

  const handleScroll = (position: number) => {
    audioRef.current?.seek(position);
  };

  const handleScrollEnd = () => {
    audioRef.current?.play();
  };

  const handlePageGuess = (questionId: number, answer: string, isCorrect: boolean) => {
    questionController.guess(questionId, answer);
  };

  if (!storyAudio) {
    return (
      <div className="story-page-controller p-4">
        <div className="text-center text-gray-500 mb-4">
          No audio available for this story
        </div>
        <PageComponent
          ref={pageRef}
          text={storyHtml}
          textMap={textMap}
          onGuess={handlePageGuess}
        />
        <SummaryComponent ref={summaryRef} />
      </div>
    );
  }

  return (
    <div className="story-page-controller p-4 space-y-4">
      {/* Audio Component (hidden) */}
      <AudioComponent
        ref={audioRef}
        url={storyAudio}
        onTimeUpdate={handleTimeUpdate}
        onPause={() => console.log('Audio paused')}
        onEnded={() => console.log('Audio ended')}
      />

      {/* Story Content */}
      <div className="bg-white p-4 rounded-lg shadow page-component-container">
        <PageComponent
          ref={pageRef}
          text={storyHtml}
          textMap={textMap}
          onScroll={handleScroll}
          onScrollStart={handleScrollStart}
          onScrollEnd={handleScrollEnd}
          onGuess={handlePageGuess}
        />
      </div>

      {/* Speed Control */}
      <div className="bg-white p-4 rounded-lg shadow speed-component-container">
        <SpeedComponent
          onToggle={handleToggle}
          onSpeedUpdate={handleSpeedUpdate}
        />
      </div>

      {/* Summary Modal */}
      <SummaryComponent ref={summaryRef} />
    </div>
  );
};

const StoryPageController: React.FC<StoryPageControllerProps> = (props) => {
  return (
    <QuestionsProvider>
      <StoryPageControllerInner {...props} />
    </QuestionsProvider>
  );
};

export default StoryPageController;