'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Question } from '@prisma/client';

export interface QuestionStatus {
  id: number;
  question: Question;
  status: 'pending' | 'complete';
  userAnswer?: string;
}

interface QuestionsContextType {
  questions: QuestionStatus[];
  setQuestions: (questions: Question[], onGuess: (questionId: number, isCorrect: boolean) => void) => void;
  getQuestions: () => QuestionStatus[];
  allQuestionsCompleted: () => boolean;
  guess: (questionId: number, answer: string) => void;
}

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

interface QuestionsProviderProps {
  children: ReactNode;
}

export const QuestionsProvider: React.FC<QuestionsProviderProps> = ({ children }) => {
  const [questions, setQuestionsState] = useState<QuestionStatus[]>([]);
  const [onGuessCallback, setOnGuessCallback] = useState<((questionId: number, isCorrect: boolean) => void) | null>(null);

  const setQuestions = useCallback((newQuestions: Question[], onGuess: (questionId: number, isCorrect: boolean) => void) => {
    const questionStatuses: QuestionStatus[] = newQuestions.map(q => ({
      id: q.id,
      question: q,
      status: 'pending' as const,
      userAnswer: undefined
    }));
    setQuestionsState(questionStatuses);
    setOnGuessCallback(() => onGuess);
  }, []);

  const getQuestions = useCallback(() => {
    return questions;
  }, [questions]);

  const allQuestionsCompleted = useCallback(() => {
    return questions.length > 0 && questions.every(q => q.status === 'complete');
  }, [questions]);

  const guess = useCallback((questionId: number, answer: string) => {
    setQuestionsState(prev => {
      const updated = prev.map(q => {
        if (q.id === questionId) {
          const isCorrect = answer.toLowerCase().trim() === q.question.correct.toLowerCase().trim();
          return {
            ...q,
            status: isCorrect ? 'complete' as const : q.status,
            userAnswer: answer
          };
        }
        return q;
      });

      // Call the onGuess callback if it exists
      const question = prev.find(q => q.id === questionId);
      if (question && onGuessCallback) {
        const isCorrect = answer.toLowerCase().trim() === question.question.correct.toLowerCase().trim();
        onGuessCallback(questionId, isCorrect);
      }

      return updated;
    });
  }, [onGuessCallback]);

  const value: QuestionsContextType = {
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

export const useQuestions = (): QuestionsContextType => {
  const context = useContext(QuestionsContext);
  if (context === undefined) {
    throw new Error('useQuestions must be used within a QuestionsProvider');
  }
  return context;
};

// QuestionController class for imperative API
export class QuestionController {
  private questionsContext: QuestionsContextType;

  constructor(questionsContext: QuestionsContextType) {
    this.questionsContext = questionsContext;
  }

  setQuestions(questions: Question[], onGuess: (questionId: number, isCorrect: boolean) => void) {
    this.questionsContext.setQuestions(questions, onGuess);
  }

  getQuestions(): QuestionStatus[] {
    return this.questionsContext.getQuestions();
  }

  allQuestionsCompleted(): boolean {
    return this.questionsContext.allQuestionsCompleted();
  }

  guess(questionId: number, answer: string) {
    this.questionsContext.guess(questionId, answer);
  }
}

// Hook to get QuestionController instance
export const useQuestionController = (): QuestionController => {
  const questionsContext = useQuestions();
  return new QuestionController(questionsContext);
};