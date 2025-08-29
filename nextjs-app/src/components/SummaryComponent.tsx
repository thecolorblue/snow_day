"use client";

import { useState } from 'react';

interface SummaryComponentProps {
  questions: any[]; // Replace with proper type
  guesses?: Record<string, string>;
}

export const SummaryComponent = ({ questions, guesses }: SummaryComponentProps) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [questionGuesses, setQuestionGuesses] = useState<Record<string, string>>(guesses || {});

  const update = (questionGuess: Record<string, string>) => {
    setQuestionGuesses(prev => ({ ...prev, ...questionGuess }));
  };

  const show = () => {
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
  };

  return (
    <div>
      {isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Summary</h2>
            <div className="space-y-3">
              {questions.map((q, index) => (
                <div key={index} className="border-b pb-2">
                  <p className="font-semibold">{q.question}</p>
                  <p>Correct answer: {q.correct}</p>
                  <p>Your guess: {questionGuesses[q.id] || 'Not answered'}</p>
                </div>
              ))}
            </div>
            <button
              onClick={hide}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};