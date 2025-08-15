"use client"; // Needs to be a client component due to randomization and potential hooks in children

import React, { useState } from 'react';
import { Question } from '@prisma/client';
import dynamic from 'next/dynamic'; // Import dynamic
import SelectQuestion from './SelectQuestion';
import DragDropQuestion from './DragDropQuestion';

const STTQuestion = dynamic(() => import('./STTQuestion'), {
  ssr: false,
  loading: () => <p>Loading speech recognition...</p>
});

interface QuestionRendererProps {
  question: Question;
  currentAnswer: string | undefined;
  handleInputChange: (questionId: number, value: string, correctAnswer: string) => void;
  getCorrectnessStatus: (questionId: number) => boolean | null; // Added prop
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question: q,
  currentAnswer,
  handleInputChange,
  getCorrectnessStatus,
}) => {
  const [random] = useState(Math.random());

  if (q.type === 'input') {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="text"
          id={`q_${q.id}_input`}
          name={`question_${q.id}`}
          required
          autoComplete="off"
          value={currentAnswer || ''}
          onChange={(e) => handleInputChange(q.id, e.target.value, q.correct)}
          className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
    );
  }

  if (q.type === 'select') {
    return (
      <SelectQuestion
        question={q}
        currentAnswer={currentAnswer}
        handleInputChange={handleInputChange}
      />
    );
  }

  // Fallback for unknown question types
  return <div className="text-red-500">Unknown question type: {q.type}</div>;
};

export default QuestionRenderer;