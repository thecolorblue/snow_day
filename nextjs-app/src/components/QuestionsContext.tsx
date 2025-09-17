'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Question } from '@prisma/client';

export interface QuestionStatus {
  id: number;
  question: Question;
  status: 'pending' | 'correct';
  userAnswer?: string;
}

interface QuestionsContextType {
  getQuestions: () => QuestionStatus[];
  guess: (questionId: number, answer: string) => void;
  setQuestions: (questions: Question[]) => void;
}

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

interface QuestionsProviderProps {
  children: ReactNode;
}

export const QuestionsProvider: React.FC<QuestionsProviderProps> = ({ children }) => {
  const [questions, setQuestionsState] = useState<QuestionStatus[]>([]);

  const setQuestions = (newQuestions: Question[]) => {
    const questionStatuses: QuestionStatus[] = newQuestions.map(q => ({
      id: q.id,
      question: q,
      status: 'pending',
      userAnswer: undefined
    }));
    setQuestionsState(questionStatuses);
  };

  const getQuestions = () => {
    return questions;
  };

  const guess = (questionId: number, answer: string) => {
    setQuestionsState(prev =>
      prev.map(q => {
        if (q.id === questionId) {
          const isCorrect = answer.toLowerCase().trim() === q.question.correct.toLowerCase().trim();
          return {
            ...q,
            status: isCorrect ? 'correct' : q.status,
            userAnswer: answer
          };
        }
        return q;
      })
    );
  };

  const value: QuestionsContextType = {
    getQuestions,
    guess,
    setQuestions
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