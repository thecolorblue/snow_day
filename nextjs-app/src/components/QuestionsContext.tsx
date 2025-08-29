"use client";

import { createContext, useContext, useState } from 'react';

interface Question {
  id: string;
  question: string;
  correct: string;
  answers: string[];
  status?: 'pending' | 'complete';
}

interface QuestionsContextType {
  questions: Question[];
  setQuestions: (questions: Question[], onGuess?: (questionId: string, guess: string) => void) => void;
  getQuestions: () => Question[];
  allQuestionsCompleted: () => boolean;
  guess: (questionId: string, questionStatus: 'correct' | 'incorrect') => void;
}

const QuestionsContext = createContext<QuestionsContextType | undefined>(undefined);

export const useQuestions = () => {
  const context = useContext(QuestionsContext);
  if (!context) {
    throw new Error('useQuestions must be used within a QuestionsProvider');
  }
  return context;
};

export const QuestionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [questions, setQuestionsState] = useState<Question[]>([]);
  const [onGuessCallback, setOnGuessCallback] = useState<((questionId: string, guess: string) => void) | undefined>(undefined);

  const setQuestions = (questionsList: Question[], onGuess?: (questionId: string, guess: string) => void) => {
    setQuestionsState(questionsList);
    setOnGuessCallback(() => onGuess);
  };

  const getQuestions = () => {
    return questions;
  };

  const allQuestionsCompleted = () => {
    return questions.every(q => q.status === 'complete');
  };

  const guess = (questionId: string, questionStatus: 'correct' | 'incorrect') => {
    setQuestionsState(prev => 
      prev.map(q => 
        q.id === questionId ? { ...q, status: 'complete' } : q
      )
    );
    
    if (onGuessCallback) {
      // Find the question to get its answer
      const question = questions.find(q => q.id === questionId);
      if (question) {
        onGuessCallback(questionId, question.correct);
      }
    }
  };

  return (
    <QuestionsContext.Provider value={{
      questions,
      setQuestions,
      getQuestions,
      allQuestionsCompleted,
      guess
    }}>
      {children}
    </QuestionsContext.Provider>
  );
};