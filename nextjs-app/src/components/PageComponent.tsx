'use client';

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useQuestions } from './QuestionsContext';
import './QuestionComponent';
import sanitizeHtml from 'sanitize-html';

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
    const { getQuestions, guess } = useQuestions();

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
      console.log(`question word clicked: ${wordIndex} ${word.text}`)
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
        
        // Only handle clicks on elements with 'word' class
        if (!target.classList.contains('word')) {
          return;
        }
        
        const wordIndex = target.getAttribute('data-word-index');
        
        if (wordIndex) {
          const index = parseInt(wordIndex, 10);
          const word = textMap[index];
          if (word) {
            handleWordClick(index, word);
          }
        }
      };
      // Handle the custom event from the Lit component
      const handleAnswerSelected = (event: CustomEvent<{ word: string; answer: string }>) => {
        const matchingQuestion = getQuestions().find(q => q.question.correct.toLowerCase() === event.detail.word.toLowerCase());

        if (matchingQuestion) {
          guess(matchingQuestion.id, event.detail.answer);

          (event.target as HTMLElement).setAttribute('state', matchingQuestion.question.correct === event.detail.answer ? 'correct': 'incorrect');
        }
      };

      const customEventListener = (event: Event) => {
        handleAnswerSelected(event as CustomEvent<{ word: string; answer: string }>);
      };

      // Add event listener to the document
      document.addEventListener('answer-selected', customEventListener);

      return () => {
        document.removeEventListener('answer-selected', customEventListener);
      };
    }, [textMap, getQuestions, guess]);

    return (
      <div className="page-component relative">
        <div
          ref={containerRef}
          className="story-content overflow-y-auto rounded-lg bg-white"
          onScroll={handleScroll}
        >
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(text, {
                allowedTags: [ 'b', 'i', 'em', 'strong', 'p', 'h1', 'h2', 'h3', 'h4' ]
              }) }} />
        </div>
      </div>
    );
  }
);

PageComponent.displayName = 'PageComponent';

export default PageComponent;