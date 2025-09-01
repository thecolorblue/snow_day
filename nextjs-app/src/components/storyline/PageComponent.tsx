'use client'
import React, { useEffect, useRef, useState } from 'react';
import { useQuestions } from './QuestionsContext';
import { StoryMapWord } from '@/lib/storyline';

interface PageComponentProps {
  text: string;
  textMap: StoryMapWord[];
  onScroll: (position: number) => void;
  onScrollStart: () => void;
  onScrollEnd: () => void;
}

const PageComponent: React.FC<PageComponentProps> = ({ text, textMap, onScroll, onScrollStart, onScrollEnd }) => {
  const { questions, guess } = useQuestions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeWord, setActiveWord] = useState<number | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        onScroll(scrollRef.current.scrollTop);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      scrollElement.addEventListener('mousedown', onScrollStart);
      scrollElement.addEventListener('mouseup', onScrollEnd);
    }

    return () => {
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', handleScroll);
        scrollElement.removeEventListener('mousedown', onScrollStart);
        scrollElement.removeEventListener('mouseup', onScrollEnd);
      }
    };
  }, [onScroll, onScrollStart, onScrollEnd]);

  useEffect(() => {
    questions.forEach(q => {
      const wordSpans = document.querySelectorAll(`.word-${q.correct.toLowerCase()}`);
      wordSpans.forEach(span => {
        (span as HTMLElement).style.color = '#ceeff8';
        (span as HTMLElement).style.textDecoration = 'underline';
        (span as HTMLElement).style.textDecorationColor = 'black';
        (span as HTMLElement).onclick = () => {
          setActiveQuestion(q.id);
        };
      });
    });
  }, [questions]);

  const updateHighlighter = (time: number) => {
    const currentWordIndex = textMap.findIndex(word => time >= word.startTime && time <= word.endTime);
    if (currentWordIndex !== -1) {
      setActiveWord(currentWordIndex);
    }
  };

  const handleGuess = (questionId: number, answer: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      guess(question, answer);
    }
    setActiveQuestion(null);
  };

  return (
    <div ref={scrollRef} style={{ overflowY: 'scroll', height: '100vh' }}>
      <div dangerouslySetInnerHTML={{ __html: text }} />
      {questions.map(q => {
        if (q.id === activeQuestion) {
          return (
            <div key={q.id} className="question-popup">
              <p>{q.question}</p>
              {q.answers?.split(',').map(answer => (
                <button key={answer} onClick={() => handleGuess(q.id, answer)}>
                  {answer}
                </button>
              ))}
            </div>
          );
        }
        return null;
      })}
      <style jsx>{`
        .word-${activeWord} {
          background-color: yellow;
        }
        .question-popup {
          position: absolute;
          background: white;
          border: 1px solid black;
          padding: 10px;
          z-index: 100;
        }
      `}</style>
    </div>
  );
};

export default PageComponent;