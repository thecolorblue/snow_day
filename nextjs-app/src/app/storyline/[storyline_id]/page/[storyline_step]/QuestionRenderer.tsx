"use client"; // Needs to be a client component due to randomization and potential hooks in children

import React from 'react';
import { Question } from '@prisma/client';
import dynamic from 'next/dynamic'; // Import dynamic

// Dynamically import STTQuestion only on the client-side
const STTQuestion = dynamic(() => import('./STTQuestion'), {
  ssr: false,
  loading: () => <p>Loading speech recognition...</p> // Optional loading state
});
// Removed SelectQuestion and DragDropQuestion imports
// Assuming ListenButton and PlayWordButton might be needed if 'input' type is handled here too
// import { ListenButton, PlayWordButton } from './StorylineStepView'; // This won't work directly, need to refactor/pass components if needed

// Props for the QuestionRenderer component
interface QuestionRendererProps {
  question: Question;
  currentAnswer: string | undefined;
  handleInputChange: (questionId: number, value: string, correctAnswer: string) => void;
  getCorrectnessStatus: (questionId: number) => boolean | null; // Added prop
  // If ListenButton/PlayWordButton are needed, they might need to be passed as props or refactored
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question: q, // Rename prop locally for consistency with original code
  currentAnswer,
  handleInputChange,
  getCorrectnessStatus, // Destructure prop
}) => {
  // Removed state and effect for random rendering

  // Render based on question type
  if (q.type === 'input') {
    // Note: ListenButton is defined within StorylineStepView.
    // To use it here, it would need to be extracted or passed as a prop.
    // For now, let's replicate the input structure without the ListenButton.
    return (
      <div className="flex items-center space-x-2">
        {/* Placeholder for ListenButton functionality */}
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

//   if (q.type === 'select') {
//     // Original logic for 'select' was just SelectQuestion
//      return (
//        <SelectQuestion
//          question={q}
//          currentAnswer={currentAnswer}
//          handleInputChange={handleInputChange}
//        />
//      );
// //   }

//   if (q.type === 'select') {
//      // Original logic for 'select' was just SelectQuestion
//       return (
//         <SelectQuestion
//           question={q}
//           currentAnswer={currentAnswer}
//           handleInputChange={handleInputChange}
//         />
//       );
//   }

  if (q.type === 'select') {
    // Always render STTQuestion for 'select' type
    return (
      <STTQuestion
        question={q}
        currentAnswer={currentAnswer}
        handleInputChange={handleInputChange}
        getCorrectnessStatus={getCorrectnessStatus} // Pass prop down
      />
    );
  }

  // Fallback for unknown question types
  return <div className="text-red-500">Unknown question type: {q.type}</div>;
};

export default QuestionRenderer;