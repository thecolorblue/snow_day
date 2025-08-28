'use client';

import React, { useRef } from 'react';
import AudioComponent, { AudioComponentRef } from './AudioComponent';
import SpeedComponent from './SpeedComponent';
import SummaryComponent, { SummaryComponentRef } from './SummaryComponent';
import PageComponent, { PageComponentRef } from './PageComponent';
import { QuestionsProvider } from './QuestionsContext';
import { StoryPageControllerWrapper } from './StoryPageController';
import { StoryMap } from '../app/storyline/[storyline_id]/page/[storyline_step]/page';

interface MobileStoryViewProps {
  storylineId: number;
  storylineStep: number;
  textMap: StoryMap[];
  storyAudio: string | null;
  storyHtml: string;
  onGuess: (question: string, guess: string, isCorrect: boolean) => void;
}

const MobileStoryView: React.FC<MobileStoryViewProps> = ({
  storylineId,
  storylineStep,
  textMap,
  storyAudio,
  storyHtml,
  onGuess
}) => {
  const audioComponentRef = useRef<AudioComponentRef>(null);
  const summaryComponentRef = useRef<SummaryComponentRef>(null);
  const pageComponentRef = useRef<PageComponentRef>(null);
  const speedComponentRef = useRef<HTMLDivElement>(null);

  return (
    <QuestionsProvider>
      <div className="mobile-story-view">
        <div className="audio-controls">
          {storyAudio && (
            <AudioComponent
              ref={audioComponentRef}
              url={storyAudio}
              onTimeUpdate={(time) => pageComponentRef.current?.updateHighlighter(time)}
              onPause={() => {}}
              onEnded={() => {}}
            />
          )}

          <div ref={speedComponentRef}>
            <SpeedComponent
              onToggle={() => {
                if (audioComponentRef.current?.isPlaying()) {
                  audioComponentRef.current.pause();
                } else {
                  audioComponentRef.current?.play();
                }
              }}
              onSpeedUpdate={(speed) => {
                audioComponentRef.current?.updateSpeed(speed);
              }}
            />
          </div>
        </div>

        <PageComponent
          ref={pageComponentRef}
          text={storyHtml}
          textMap={textMap.map(item => ({
            text: item.text,
            startTime: item.startTime,
            endTime: item.endTime,
            startOffsetUtf32: item.startOffsetUtf32,
            endOffsetUtf32: item.endOffsetUtf32,
            index: 0
          }))}
          onScroll={(scrollTop) => audioComponentRef.current?.seek(scrollTop / 100)}
          onScrollStart={() => audioComponentRef.current?.pause()}
          onScrollEnd={() => audioComponentRef.current?.play()}
          onGuess={onGuess}
        />

        <SummaryComponent
          ref={summaryComponentRef}
        />

        <StoryPageControllerWrapper
          speedComponent={speedComponentRef}
          audioComponent={audioComponentRef}
          summaryComponent={summaryComponentRef}
          pageComponent={pageComponentRef}
          onGuess={onGuess}
        />
      </div>
    </QuestionsProvider>
  );
};

export default MobileStoryView;