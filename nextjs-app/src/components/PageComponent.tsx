'use client';

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useQuestions } from './QuestionsContext';

export interface PageComponentRef {
  updateHighlighter: (timeupdate: number) => void;
  update: (questionGuess: any) => void;
}

interface TextMapItem {
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32?: number;
  endOffsetUtf32?: number;
  index?: number;
}

interface PageComponentProps {
  text: string;
  textMap: TextMapItem[];
  onScroll: (scrollTop: number) => void;
  onScrollStart: () => void;
  onScrollEnd: () => void;
  onGuess: (question: string, guess: string, isCorrect: boolean) => void;
}

interface HighlightedWord {
  element: HTMLElement;
  originalStyles: string;
}

const PageComponent = forwardRef<PageComponentRef, PageComponentProps>(({
  text,
  textMap,
  onScroll,
  onScrollStart,
  onScrollEnd,
  onGuess,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { questions, controller } = useQuestions();
  const [activeAnswer, setActiveAnswer] = useState<{ element: HTMLElement; answers: string[]; correct: string } | null>(null);
  const [highlightedWords, setHighlightedWords] = useState<HighlightedWord[]>([]);
  const isScrollingRef = useRef(false);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (containerRef.current && !isScrollingRef.current) {
      isScrollingRef.current = true;
      onScrollStart();
    }

    if (containerRef.current) {
      onScroll(containerRef.current.scrollTop);
    }
  }, [onScroll, onScrollStart]);

  const handleScrollEnd = useCallback(() => {
    setTimeout(() => {
      if (isScrollingRef.current) {
        isScrollingRef.current = false;
        onScrollEnd();
      }
    }, 150);
  }, [onScrollEnd]);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('scroll', handleScrollEnd);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scroll', handleScrollEnd);
    };
  }, [handleScroll, handleScrollEnd]);

  // Process questions and add styling to word spans
  useEffect(() => {
    const container = containerRef.current;
    if (!container || questions.length === 0) return;

    const wordsToHighlight: HighlightedWord[] = [];

    questions.forEach(q => {
      if (q.correct) {
        const wordSpans = container.querySelectorAll(`span.word-${q.correct}`);
        wordSpans.forEach(span => {
          const element = span as HTMLElement;
          const originalStyles = element.getAttribute('style') || '';
          element.style.cssText += `
            color: #ceeff8;
            text-decoration: underline;
            text-decoration-color: black;
            cursor: pointer;
          `;
          element.setAttribute('data-correct', q.correct.toLowerCase());
          element.onclick = () => handleWordClick(element, q);

          wordsToHighlight.push({ element, originalStyles });
        });
      }
    });

    setHighlightedWords(wordsToHighlight);

    // Cleanup function
    return () => {
      wordsToHighlight.forEach(({ element, originalStyles }) => {
        element.style.cssText = originalStyles;
        element.onclick = null;
      });
    };
  }, [questions]);

  const handleWordClick = useCallback((element: HTMLElement, question: any) => {
    // Remove any existing answer display
    if (activeAnswer) {
      activeAnswer.element.parentNode?.removeChild(activeAnswer.element);
    }

    // Create answer options
    const answers = question.answers ? question.answers.split(',').map((a: string) => a.trim()) : [];
    const answerDiv = document.createElement('div');
    answerDiv.className = 'answer-options';
    answerDiv.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      margin-top: 4px;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

    answers.forEach((answer: string) => {
      const button = document.createElement('button');
      button.textContent = answer;
      button.style.cssText = `
        display: block;
        margin: 2px 0;
        padding: 4px 8px;
        border: 1px solid #ddd;
        background: #f9f9f9;
        cursor: pointer;
        border-radius: 3px;
      `;
      button.onmouseover = () => button.style.background = '#e9e9e9';
      button.onmouseout = () => button.style.background = '#f9f9f9';
      button.onclick = () => {
        const isCorrect = answer.toLowerCase() === question.correct.toLowerCase();
        controller.guess(question.key, answer, isCorrect ? 'correct' : 'incorrect');
        onGuess(question.question, answer, isCorrect);

        // Remove the answer options
        answerDiv.parentNode?.removeChild(answerDiv);
        setActiveAnswer(null);
      };
      answerDiv.appendChild(button);
    });

    // Position the answer div below the clicked word
    const rect = element.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      answerDiv.style.left = `${rect.left - containerRect.left}px`;
      answerDiv.style.top = `${rect.bottom - containerRect.top}px`;

      // Add to container
      containerRef.current?.appendChild(answerDiv);

      setActiveAnswer({
        element: answerDiv,
        answers,
        correct: question.correct
      });
    }
  }, [activeAnswer, controller, onGuess]);

  const updateHighlighter = useCallback((timeUpdate: number) => {
    const container = containerRef.current;
    if (!container) return;

    // Remove previous highlighting
    const prevHighlighted = container.querySelectorAll('.current-highlight');
    prevHighlighted.forEach(el => el.classList.remove('current-highlight'));

    // Find the corresponding element in textMap
    const currentItem = textMap.find(item =>
      timeUpdate >= item.startTime && timeUpdate <= item.endTime
    );

    if (currentItem) {
      // Try to find element by data attributes or text content
      const elements = container.querySelectorAll('[data-start-time]');
      elements.forEach((el: Element) => {
        const element = el as HTMLElement;
        const startTime = parseFloat(element.getAttribute('data-start-time') || '0');
        const endTime = parseFloat(element.getAttribute('data-end-time') || '0');

        if (timeUpdate >= startTime && timeUpdate <= endTime) {
          element.classList.add('current-highlight');
          element.style.backgroundColor = '#ffff99';
        }
      });
    }
  }, [textMap]);

  useImperativeHandle(ref, () => ({
    updateHighlighter,
    update: (guess: any) => {
      // Handle internal updates if needed
    }
  }), [updateHighlighter]);

  return (
    <div
      ref={containerRef}
      className="page-component prose max-w-none overflow-y-auto"
      style={{ height: '400px', padding: '16px' }}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
});

PageComponent.displayName = 'PageComponent';

export default PageComponent;