import React from 'react';
import { Question } from '@prisma/client'; // Import from Prisma client

interface SelectQuestionProps {
  question: Question;
  currentAnswer: string | undefined;
  handleInputChange: (questionId: number, value: string) => void;
}

const SelectQuestion: React.FC<SelectQuestionProps> = ({ question, currentAnswer, handleInputChange }) => {
  if (question.type !== 'select' || !question.answers) {
    return null; // Or some fallback UI
  }

  return (
    <>
      {question.answers.split(',').map((a: string, ansIndex: number) => (
        <label key={ansIndex} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 cursor-pointer">
          <input
            type="radio"
            id={`q_${question.id}_ans_${ansIndex}`} // More specific ID
            name={`question_${question.id}`} // Unique name per question group
            value={a}
            required
            checked={currentAnswer === a}
            onChange={(e) => handleInputChange(question.id, e.target.value)}
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
          />
          <span className="text-sm">{a}</span>
        </label>
      ))}
    </>
  );
};

export default SelectQuestion;