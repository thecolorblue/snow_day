'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Question } from '@prisma/client';

export type QuestionWithStatus = Question & {
  status?: 'pending' | 'complete';
  userGuess?: string;
};

interface QuestionController {
  setQuestions: (questions: Question[], onGuess: (question: string, guess: string, isCorrect: boolean) => void) => void;
  getQuestions: () => QuestionWithStatus[];
  allQuestionsCompleted: () => boolean;
  guess: (questionKey: string, guess: string, questionStatus?: 'correct' | 'incorrect') => void;
}

interface QuestionsContextType {
  questions: QuestionWithStatus[];
  controller: QuestionController;
}

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

interface QuestionsProviderProps {
  children: ReactNode;
}

export function QuestionsProvider({ children }: QuestionsProviderProps) {
  const [questions, setQuestions] = useState<QuestionWithStatus[]>([]);
  const [onGuessCallback, setOnGuessCallback] = useState<((question: string, guess: string, isCorrect: boolean) => void) | null>(null);

  const controller: QuestionController = {
    setQuestions: useCallback((newQuestions: Question[], callback: (question: string, guess: string, isCorrect: boolean) => void) => {
      const questionsWithStatus: QuestionWithStatus[] = newQuestions.map(q => ({
        ...q,
        status: 'pending' as const,
      }));
      setQuestions(questionsWithStatus);
      setOnGuessCallback(() => callback);
    }, []),

    getQuestions: useCallback(() => questions, [questions]),

    allQuestionsCompleted: useCallback(() => {
      return questions.length > 0 && questions.every(q => q.status === 'complete');
    }, [questions]),

    guess: useCallback((questionKey: string, guess: string, questionStatus: 'correct' | 'incorrect' = 'incorrect') => {
      setQuestions(prev =>
        prev.map(q => {
          if (q.key === questionKey) {
            const isCorrect = questionStatus === 'correct';
            const updatedQuestion: QuestionWithStatus = {
              ...q,
              status: 'complete',
              userGuess: guess,
            };

            // Call the callback if provided
            if (onGuessCallback) {
              onGuessCallback(q.question, guess, isCorrect);
            }

            return updatedQuestion;
          }
          return q;
        })
      );
    }, [onGuessCallback]),
  };

  return (
    <QuestionsContext.Provider value={{ questions, controller }}>
      {children}
    </QuestionsContext.Provider>
  );
}

export type { QuestionController };

export function useQuestions() {
  const context = useContext(QuestionsContext);
  if (context === undefined) {
    throw new Error('useQuestions must be used within a QuestionsProvider');
  }
  return context;
}