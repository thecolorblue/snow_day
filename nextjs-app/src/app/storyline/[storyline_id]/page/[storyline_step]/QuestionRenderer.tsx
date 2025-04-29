"use client"; // Needs to be a client component due to randomization and potential hooks in children

import React, { useState, useEffect } from 'react';
import { Question } from '@prisma/client';
import SelectQuestion from './SelectQuestion';
import DragDropQuestion from './DragDropQuestion';
// Assuming ListenButton and PlayWordButton might be needed if 'input' type is handled here too
// import { ListenButton, PlayWordButton } from './StorylineStepView'; // This won't work directly, need to refactor/pass components if needed

// Props for the QuestionRenderer component
interface QuestionRendererProps {
  question: Question;
  currentAnswer: string | undefined;
  handleInputChange: (questionId: number, value: string, correctAnswer: string) => void;
  // If ListenButton/PlayWordButton are needed, they might need to be passed as props or refactored
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question: q, // Rename prop locally for consistency with original code
  currentAnswer,
  handleInputChange,
}) => {
  // State to store the stable random choice for dragdrop type
  const [renderAsDragDrop, setRenderAsDragDrop] = useState<boolean | null>(null);

  // Make the random choice only once when the question ID changes
  useEffect(() => {
    if (q.type === 'select') {
      setRenderAsDragDrop(Math.random() < 0.5);
    } else {
      setRenderAsDragDrop(null); // Reset if type changes
    }
  }, [q.id, q.type]); // Dependency array ensures this runs only when the question changes

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
    // Wait until the random choice state is set
    if (renderAsDragDrop === null) {
      return null; // Or a loading indicator
    }

    // Use the stable state value for rendering
    if (renderAsDragDrop) {
      return (
        <DragDropQuestion
          question={q}
          currentAnswer={currentAnswer}
          handleInputChange={handleInputChange}
        />
      );
    } else {
      return (
        <SelectQuestion
          question={q}
          currentAnswer={currentAnswer}
          handleInputChange={handleInputChange}
        />
      );
    }
  }

  // Fallback for unknown question types
  return <div className="text-red-500">Unknown question type: {q.type}</div>;
};

export default QuestionRenderer;