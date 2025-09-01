'use client'
import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react';

// Manually define the Question type based on schema.prisma
export interface Question {
  id: number;
  type: string;
  question: string;
  key: string;
  correct: string;
  answers: string | null;
  classroom: string;
}

export interface QuestionWithStatus extends Question {
  status?: 'correct' | 'incorrect' | 'unanswered';
  guess?: string;
}

type GuessCallback = (question: QuestionWithStatus, status: 'correct' | 'incorrect', allCompleted: boolean) => void;

interface QuestionsContextType {
  questions: QuestionWithStatus[];
  setQuestions: (questions: Question[], onGuess: GuessCallback) => void;
  getQuestions: () => QuestionWithStatus[];
  allQuestionsCompleted: () => boolean;
  guess: (question: QuestionWithStatus, answer: string) => void;
}

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

export const useQuestions = () => {
  const context = useContext(QuestionsContext);
  if (!context) {
    throw new Error('useQuestions must be used within a QuestionsProvider');
  }
  return context;
};

interface QuestionsProviderProps {
  children: ReactNode;
}

export const QuestionsProvider: React.FC<QuestionsProviderProps> = ({ children }) => {
  const [questions, setQuestionsState] = useState<QuestionWithStatus[]>([]);
  const onGuessCallbackRef = useRef<GuessCallback | null>(null);

  const setQuestions = useCallback((initialQuestions: Question[], onGuess: GuessCallback) => {
    setQuestionsState(initialQuestions.map(q => ({ ...q, status: 'unanswered' })));
    onGuessCallbackRef.current = onGuess;
  }, []);

  const getQuestions = useCallback(() => {
    return questions;
  }, [questions]);

  const allQuestionsCompleted = useCallback(() => {
    return questions.every(q => q.status === 'correct');
  }, [questions]);

  const guess = useCallback((question: QuestionWithStatus, answer: string) => {
    const isCorrect = answer.toLowerCase() === question.correct.toLowerCase();
    const status: 'correct' | 'incorrect' = isCorrect ? 'correct' : 'incorrect';

    const updatedQuestions = questions.map(q =>
      q.id === question.id ? { ...q, status, guess: answer } : q
    );
    setQuestionsState(updatedQuestions);

    const allCompleted = updatedQuestions.every(q => q.status === 'correct');

    if (onGuessCallbackRef.current) {
      onGuessCallbackRef.current(question, status, allCompleted);
    }
  }, [questions]);

  const value = {
      questions,
      setQuestions,
      getQuestions,
      allQuestionsCompleted,
      guess
  };

  return (
    <QuestionsContext.Provider value={value}>
      {children}
    </QuestionsContext.Provider>
  );
};