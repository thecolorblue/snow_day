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
  onSeek?: (timePosition: number, duration: number) => void;
  className?: string;
}

const StoryContentWrapper = forwardRef<StoryContentWrapperRef, StoryContentWrapperProps>(({
  markdown,
  questions,
  storyMap,
  onScrollStart,
  onSeek,
  onScrollEnd,
  className = "story-content overflow-y-auto rounded-lg p-4"
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const storyElementRef = useRef<any>(null);
  const { guess } = useQuestions();
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [comprehensionQuestions, setComprehensionQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{[key: number]: string}>({});
  const [answerResults, setAnswerResults] = useState<{[key: number]: 'correct' | 'incorrect' | null}>({});

  useEffect(() => {
    // Import the web component dynamically
    import('./StoryContent');
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    let storyElement;
    if (!container) return;

    // Separate comprehension questions from other questions
    const nonComprehensionQuestions = questions.filter(q => q.type !== 'comprehension');
    const comprehensionQs = questions.filter(q => q.type === 'comprehension');
    setComprehensionQuestions(comprehensionQs);

    if (container.children?.[0]?.nodeName === 'STORY-CONTENT') {
      storyElement = container.children[0];
    } else {
      // Create the story-content element
      storyElement = document.createElement('story-content');
      storyElementRef.current = storyElement;
      storyElement.markdown = markdown;
      storyElement.questions = JSON.stringify(nonComprehensionQuestions);
      storyElement.storyMap = JSON.stringify(storyMap);

      // Clear container and append the element
      container.innerHTML = '';
      container.appendChild(storyElement);
    }

    // Handle the custom event from the Lit component
    const handleQuestionGuess = (event: CustomEvent<{ questionId: number; answer: string }>) => {
      guess(event.detail.questionId, event.detail.answer);
    };

    const handleSelectWord = (event: CustomEvent) => {
      // find start of word time position
      // tell parent to play from timeposition for word duration
      const { wordIndex } = event.detail;
      
      if (storyMap && wordIndex >= 0 && wordIndex < storyMap.length) {
        const selectedWord = storyMap[wordIndex];
        const startTime = selectedWord.startTime;
        const duration = selectedWord.endTime - selectedWord.startTime;
        
        // Call onSeek with the word's start time
        onSeek?.(startTime, duration);
      }
    }

    // Add event listeners
    storyElement.addEventListener('story-select-word', handleSelectWord as EventListener);
    storyElement.addEventListener('question-guess', handleQuestionGuess as EventListener);


    return () => {
      storyElement.removeEventListener('story-select-word', handleSelectWord as EventListener);
      storyElement.removeEventListener('question-guess', handleQuestionGuess as EventListener);
    };
  }, [markdown, questions, storyMap, onSeek, onScrollStart, onScrollEnd, guess]);

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

  const handleComprehensionAnswer = (questionId: number, answer: string) => {
    const question = comprehensionQuestions.find(q => q.id === questionId);
    if (!question) return;

    setSelectedAnswers(prev => ({ ...prev, [questionId]: answer }));
    
    const isCorrect = answer === question.correct;
    setAnswerResults(prev => ({ ...prev, [questionId]: isCorrect ? 'correct' : 'incorrect' }));
    
    // Call the guess callback
    guess(questionId, answer);
  };

  return (
    <div>
      <div
        className={className}>
          <div ref={containerRef}></div>
      
      {/* Comprehension Questions */}
      {comprehensionQuestions.length > 0 && (
        <div className="mt-4 space-y-4">
          {comprehensionQuestions.map((question) => {
            const answers = question.answers ? question.answers.split(',').map(a => a.trim()) : [];
            const result = answerResults[question.id];
            const selectedAnswer = selectedAnswers[question.id];
            
            return (
              <div
                key={question.id}
                className={`p-4 border-2 rounded-lg ${
                  result === 'correct'
                    ? 'border-green-500'
                    : result === 'incorrect'
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
              >
                <h3 className="text-lg font-semibold mb-3">{question.question}</h3>
                <div className="space-y-2">
                  {answers.map((answer, index) => (
                    <button
                      key={index}
                      onClick={() => handleComprehensionAnswer(question.id, answer)}
                      // disabled={!!selectedAnswer}
                      className={`w-full text-left p-3 rounded border transition-colors ${
                        selectedAnswer === answer
                          ? result === 'correct'
                            ? 'bg-green-100 border-green-500'
                            : 'bg-red-100 border-red-500'
                          : selectedAnswer
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {answer}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
});

StoryContentWrapper.displayName = 'StoryContentWrapper';
export default StoryContentWrapper;