'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import AudioComponent, { AudioComponentRef } from './AudioComponent';
import SpeedComponent from './SpeedComponent';
import SummaryComponent, { SummaryComponentRef } from './SummaryComponent';
import { QuestionsProvider, useQuestionController } from './QuestionsContext';
import StoryContentWrapper, { StoryContentWrapperRef, StoryMapWord } from './StoryContentWrapper';

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
  storyMap: StoryMapWord[];
  questions: Question[];
}

const StoryPageControllerInner: React.FC<StoryPageControllerProps> = ({
  storyHtml,
  storyAudio,
  storyMap,
  questions
}) => {
  const audioRef = useRef<AudioComponentRef>(null);
  const summaryRef = useRef<SummaryComponentRef>(null);
  const storyContentRef = useRef<StoryContentWrapperRef>(null);
  const questionController = useQuestionController();

  const shuffledQuestions = useMemo(() => {
    return questions.slice().sort(() => Math.random() - 0.5);
  }, [questions]);

  // useEffect(() => {
  //   if (questions && questions.length > 0) {
  //     setupListeners();
  //   }
  // }, [questions]);

  // const setupListeners = () => {
  //   // Set up questions in the controller
  //   questionController.setQuestions(questions, handleGuess);
  // };

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
    storyContentRef.current?.updateHighlighter(time);
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
    console.log('scroll to: ', position)
    audioRef.current?.seek(position);
  };

  const handleScrollEnd = () => {
    audioRef.current?.play();
  };

  if (!storyAudio) {
    return (
      <div className="story-page-controller p-4">
        <div className="text-center text-gray-500 mb-4">
          No audio available for this story
        </div>
        <div className="bg-white p-4 rounded-lg shadow page-component-container">
        </div>
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
      />

      {/* Story Content */}
      <div className="bg-white p-4 rounded-lg shadow page-component-container">
        <StoryContentWrapper
          ref={storyContentRef}
          markdown={storyHtml}
          questions={shuffledQuestions}
          storyMap={storyMap}
          onScrollStart={handleScrollStart}
          onScroll={handleScroll}
          onScrollEnd={handleScrollEnd}
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