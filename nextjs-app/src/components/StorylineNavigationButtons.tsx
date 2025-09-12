'use client';

import { useQuestions } from '@/components/QuestionsContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface StorylineNavigationButtonsProps {
  storylineId: number;
  storylineStep: number;
  storylineDetails: {
    progress: Record<string, boolean>;
  } | null;
}

export default function StorylineNavigationButtons({
  storylineId,
  storylineStep,
  storylineDetails,
}: StorylineNavigationButtonsProps) {
  const { getQuestions } = useQuestions();
  const [isCompleted, setIsCompleted] = useState(false);

  const allQuestionsCompleted = () => {
    const questions = getQuestions();
    return questions.length > 0 && questions.every(q => q.status === 'correct');
  };

  const checkCompletion = () => {
    const completed = allQuestionsCompleted();
    setIsCompleted(completed);
  };

  useEffect(() => {
    // Initial check
    checkCompletion();

    // Listen for question-guess events
    const handleQuestionGuess = () => {
      checkCompletion();
    };

    document.addEventListener('question-guess', handleQuestionGuess);

    return () => {
      document.removeEventListener('question-guess', handleQuestionGuess);
    };
  }, [getQuestions]);

  return (
    <div className="bg-white border-t px-4 py-3">
      <div className="flex justify-between items-center">
        <div>
          {storylineStep > 1 && (
            <Link
              href={`/storyline/${storylineId}/mobile/${storylineStep - 1}`}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Previous</span>
            </Link>
          )}
        </div>

        <div>
          {storylineDetails && storylineStep < Object.keys(storylineDetails.progress).length && (
            <Link
              href={`/storyline/${storylineId}/mobile/${storylineStep + 1}`}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                isCompleted
                  ? 'bg-blue-600 text-white hover:bg-blue-700 transition-colors'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => {
                if (!isCompleted) {
                  e.preventDefault();
                }
              }}
              aria-disabled={!isCompleted}
            >
              <span className="text-sm">Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}