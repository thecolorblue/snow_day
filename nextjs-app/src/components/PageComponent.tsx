'use client';

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useQuestions } from './QuestionsContext';
import { match } from 'assert';

export interface StoryMapWord {
  type: string;
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32: number;
  endOffsetUtf32: number;
}

interface PageComponentProps {
  text: string;
  textMap: StoryMapWord[];
  onScroll?: (position: number) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;
  onGuess?: (questionId: number, answer: string, isCorrect: boolean) => void;
}

export interface PageComponentRef {
  updateHighlighter: (timeUpdate: number) => void;
  update: (questionGuess: any) => void;
  show: () => void;
}

const PageComponent = forwardRef<PageComponentRef, PageComponentProps>(
  ({ text, textMap, onScroll, onScrollStart, onScrollEnd, onGuess }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
    const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { getQuestions } = useQuestions();

    useImperativeHandle(ref, () => ({
      updateHighlighter: (timeUpdate: number) => {
        if (!textMap) return;
        
        // Find the word that should be highlighted based on time
        const currentWordIndex = textMap.findIndex(word =>
          timeUpdate >= word.startTime && timeUpdate < word.endTime
        );

        if (currentWordIndex !== -1 && currentWordIndex !== highlightedWordIndex) {
          setHighlightedWordIndex(currentWordIndex);
        }
      },
      update: (questionGuess: any) => {
        // Keep internally - could be used for local state updates
        console.log('PageComponent update:', questionGuess);
      },
      show: () => {
        // Show modal with summary - this might not be needed for PageComponent
        console.log('PageComponent show called');
      }
    }));

    useEffect(()=> {
      const word = containerRef.current?.querySelector(`.word-${highlightedWordIndex}`);
      const questions = getQuestions();
      const words = containerRef.current?.querySelectorAll('.word');
      
      words?.forEach(w => w.classList.remove('highlighted-word'));

      if (word) {
        // add 'highlighted-word' to classlist of word
        word.classList.add('highlighted-word');
      }

      textMap.forEach((word, index) => {
        const matchingQuestion = questions.find(q => 
          q.question.correct.toLowerCase() === word.text.toLowerCase()
        );
        if (matchingQuestion && matchingQuestion.status === 'pending') {
          const wordEl = containerRef.current?.querySelector(`.word-${index}`);
          wordEl?.classList.add('question-word')
        }
      })
    }, [highlightedWordIndex]);

    // Handle scroll events
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const element = e.currentTarget;
      const scrollPosition = element.scrollTop;
      const maxScroll = element.scrollHeight - element.clientHeight;
      const scrollPercentage = maxScroll > 0 ? scrollPosition / maxScroll : 0;

      if (!isScrolling) {
        setIsScrolling(true);
        onScrollStart?.();
      }

      // Convert scroll percentage to time position (assuming textMap represents timeline)
      if (textMap && textMap.length > 0) {
        const totalDuration = Math.max(...textMap.map(word => word.endTime));
        const timePosition = scrollPercentage * totalDuration;
        onScroll?.(timePosition);
      }

      // Clear existing timeout and set new one for scroll end detection
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        onScrollEnd?.();
      }, 150); // 150ms delay to detect scroll end
    };

    // Handle word clicks for questions
    const handleWordClick = (wordIndex: number, word: StoryMapWord) => {
      const questions = getQuestions();
      const matchingQuestion = questions.find(q => 
        q.question.correct.toLowerCase() === word.text.toLowerCase()
      );

      if (matchingQuestion) {
        setActiveQuestionId(matchingQuestion.id);
      }
    };

    // Handle answer selection
    const handleAnswerClick = (questionId: number, answer: string) => {
      const questions = getQuestions();
      const question = questions.find(q => q.id === questionId);
      
      if (question) {
        const isCorrect = answer.toLowerCase().trim() === question.question.correct.toLowerCase().trim();
        onGuess?.(questionId, answer, isCorrect);
      }
      
      setActiveQuestionId(null);
    };

    // Add click event listeners for question words
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleClick = (e: Event) => {
        const target = e.target as HTMLElement;
        const wordIndex = target.getAttribute('data-word-index');
        
        if (wordIndex && target.classList.contains('question-word')) {
          const index = parseInt(wordIndex, 10);
          const word = textMap[index];
          if (word) {
            handleWordClick(index, word);
          }
        }
      };

      container.addEventListener('click', handleClick);
      return () => container.removeEventListener('click', handleClick);
    }, [textMap]);

    // Get active question details
    const activeQuestion = activeQuestionId ? 
      getQuestions().find(q => q.id === activeQuestionId) : null;

    const activeQuestionAnswers = activeQuestion?.question.answers ?
      activeQuestion.question.answers.split(',').map((a: string) => a.trim()) : [];

    return (
      <div className="page-component relative">
        <div
          ref={containerRef}
          className="story-content overflow-y-auto rounded-lg bg-white"
          onScroll={handleScroll}
        >
          <div dangerouslySetInnerHTML={{ __html: text }} />
        </div>

        {/* Question answers popup */}
        {activeQuestion && (
          <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-lg shadow-lg z-10">
            <h4 className="font-medium mb-2">{activeQuestion.question.question}</h4>
            <div className="space-y-2">
              {activeQuestionAnswers.map((answer: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(activeQuestion.id, answer)}
                  className="block w-full text-left p-2 rounded hover:bg-gray-100"
                >
                  {answer}
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveQuestionId(null)}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }
);

PageComponent.displayName = 'PageComponent';

export default PageComponent;