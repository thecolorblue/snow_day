'use client';

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Question } from '@prisma/client';
import { useQuestions } from './QuestionsContext';

export interface StoryMapWord {
  type: string;
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32: number;
  endOffsetUtf32: number;
}

export interface StoryContentWrapperRef {
  updateHighlighter: (timeUpdate: number) => void;
  update: (questionGuess: any) => void;
  show: () => void;
}

interface StoryContentWrapperProps {
  markdown: string;
  questions: Question[];
  storyMap: StoryMapWord[];
  onScrollStart?: () => void;
  onScroll?: (timePosition: number) => void;
  onScrollEnd?: () => void;
  className?: string;
}

const StoryContentWrapper = forwardRef<StoryContentWrapperRef, StoryContentWrapperProps>(({
  markdown,
  questions,
  storyMap,
  onScrollStart,
  onScroll,
  onScrollEnd,
  className = "story-content overflow-y-auto rounded-lg bg-white"
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const storyElementRef = useRef<any>(null);
  const { guess } = useQuestions();
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);

  useEffect(() => {
    // Import the web component dynamically
    import('./StoryContent');
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    let storyElement;
    if (!container) return;


    if (container.children?.[0]?.nodeName === 'STORY-CONTENT') {
      storyElement = container.children[0];
    } else {
      // Create the story-content element
      storyElement = document.createElement('story-content');
      storyElementRef.current = storyElement;
      storyElement.markdown = markdown;
      storyElement.questions = JSON.stringify(questions);
      storyElement.storyMap = JSON.stringify(storyMap);

      // Clear container and append the element
      container.innerHTML = '';
      container.appendChild(storyElement);
    }

    // Handle the custom event from the Lit component
    const handleQuestionGuess = (event: CustomEvent<{ questionId: number; answer: string }>) => {
      guess(event.detail.questionId, event.detail.answer);
    };

    const handleStoryScroll = (event: CustomEvent) => {
      const element = event.target as HTMLElement;
      //@ts-ignore
      const scrollPosition = element.shadowRoot.children[0].scrollTop;
      const maxScroll = element.scrollHeight;
      const scrollPercentage = maxScroll > 0 ? scrollPosition / maxScroll : 0;

      console.log(scrollPosition);
      // Convert scroll percentage to time position (assuming storyMap represents timeline)
      if (storyMap && storyMap.length > 0) {
        const totalDuration = Math.max(...storyMap.map(word => word.endTime));
        const timePosition = scrollPercentage * totalDuration;
        onScroll?.(timePosition);
      }
    };

    // Add event listeners
    storyElement.addEventListener('story-scroll', handleStoryScroll as EventListener);
    storyElement.addEventListener('question-guess', handleQuestionGuess as EventListener);


    return () => {
      storyElement.removeEventListener('story-scroll', handleStoryScroll as EventListener);
      storyElement.removeEventListener('question-guess', handleQuestionGuess as EventListener);
    };
  }, [markdown, questions, storyMap, onScroll, onScrollStart, onScrollEnd, guess]);

  useImperativeHandle(ref, () => ({
    updateHighlighter: (timeUpdate: number) => {
      if (!storyMap) return;
      
      const currentWordIndex = storyMap.findIndex(word =>
        timeUpdate >= word.startTime && timeUpdate < word.endTime
      );

      if (currentWordIndex !== -1 && currentWordIndex !== highlightedWordIndex) {
        setHighlightedWordIndex(currentWordIndex);
      }
    },
    update: (questionGuess: any) => {
      console.log('StoryContentWrapper update:', questionGuess);
    },
    show: () => {
      console.log('StoryContentWrapper show called');
    }
  }));

  useEffect(()=> {
    if (!storyElementRef.current) return;

    const storyContentElement = storyElementRef.current?.shadowRoot?.children?.[0];

    if (storyContentElement) {
    const word = storyContentElement.querySelector(`.word-${highlightedWordIndex}`);
    const words = storyContentElement.querySelectorAll('.word');
    
    words?.forEach((w: Element) => w.classList.remove('highlighted-word'));

    if (word) {
      word.classList.add('highlighted-word');
    }

    }
  }, [highlightedWordIndex]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: '100%' }}
    />
  );
});

StoryContentWrapper.displayName = 'StoryContentWrapper';
export default StoryContentWrapper;