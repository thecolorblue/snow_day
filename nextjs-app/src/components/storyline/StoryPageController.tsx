'use client'
import React, { useEffect, useRef, useCallback } from 'react';
import SpeedComponent from './SpeedComponent';
import AudioComponent, { AudioPlayer } from './AudioComponent';
import SummaryComponent, { SummaryComponentRef } from './SummaryComponent';
import PageComponent from './PageComponent';
import { useQuestions } from './QuestionsContext';
import { StoryMapWord } from '@/lib/storyline';
import { Question } from './QuestionsContext';

interface StoryPageControllerProps {
  storyHtml: string;
  storyAudio: string | null;
  wordList: StoryMapWord[];
  questions: Question[];
}

const StoryPageController: React.FC<StoryPageControllerProps> = ({ storyHtml, storyAudio, wordList, questions: initialQuestions }) => {
  const audioComponentRef = useRef<AudioPlayer | null>(null);
  const summaryComponentRef = useRef<SummaryComponentRef>(null);
  const pageComponentRef = useRef<{ updateHighlighter: (time: number) => void }>(null);
  const { setQuestions } = useQuestions();

  const onGuess = useCallback((question: any, status: any, allCompleted: boolean) => {
    summaryComponentRef.current?.update({ question: question.question, correct: status === 'correct' });
    if (allCompleted) {
      summaryComponentRef.current?.show();
    }
  }, []);

  useEffect(() => {
    setQuestions(initialQuestions, onGuess);
  }, [initialQuestions, setQuestions, onGuess]);

  const handleSpeedUpdate = (speed: number) => {
    audioComponentRef.current?.updateSpeed(speed);
  };

  const handleTogglePlay = () => {
    if (audioComponentRef.current?.isPlaying()) {
      audioComponentRef.current?.pause();
    } else {
      audioComponentRef.current?.play();
    }
  };

  const handleTimeUpdate = (time: number) => {
    pageComponentRef.current?.updateHighlighter(time);
  };

  const handleScrollStart = () => {
    audioComponentRef.current?.pause();
  };

  const handleScroll = (position: number) => {
    // This is tricky to map scroll position to audio time.
    // For now, we'll leave this unimplemented.
  };

  const handleScrollEnd = () => {
    audioComponentRef.current?.play();
  };

  return (
    <div>
      {storyAudio && (
        <AudioComponent
          url={storyAudio}
          onTimeUpdate={handleTimeUpdate}
          onPause={() => {}}
          onEnded={() => {}}
          controller={(player) => (audioComponentRef.current = player)}
        />
      )}
      <SpeedComponent onSpeedUpdate={handleSpeedUpdate} onToggle={handleTogglePlay} />
      <PageComponent
        text={storyHtml}
        textMap={wordList}
        onScroll={handleScroll}
        onScrollStart={handleScrollStart}
        onScrollEnd={handleScrollEnd}
      />
      <SummaryComponent ref={summaryComponentRef} />
    </div>
  );
};

export default StoryPageController;