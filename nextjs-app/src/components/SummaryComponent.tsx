'use client';

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';

export interface SummaryComponentRef {
  update: (questionGuess: QuestionGuess) => void;
  show: () => void;
}

export interface QuestionGuess {
  question: string;
  guess: string;
  correct: string;
  isCorrect: boolean;
}

interface SummaryComponentProps {
  onClose?: () => void;
}

const SummaryComponent = forwardRef<SummaryComponentRef, SummaryComponentProps>(({
  onClose,
}, ref) => {
  const [guesses, setGuesses] = useState<QuestionGuess[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const update = (questionGuess: QuestionGuess) => {
    setGuesses(prev => [...prev, questionGuess]);
  };

  const show = () => {
    setIsVisible(true);
  };

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  useImperativeHandle(ref, () => ({
    update,
    show,
  }), []);

  const correctCount = guesses.filter(guess => guess.isCorrect).length;
  const totalCount = guesses.length;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Quiz Summary</h2>
            <span className="text-sm text-gray-600">
              {correctCount} / {totalCount} correct
            </span>
          </div>

          <div className="space-y-3">
            {guesses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No questions answered yet</p>
            ) : (
              guesses.map((guess, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    guess.isCorrect
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <p className="font-medium text-sm mb-1">{guess.question}</p>
                  <div className="text-sm">
                    <span className="text-gray-600">Your answer: </span>
                    <span className={`${guess.isCorrect ? 'text-green-700' : 'text-red-700'} font-medium`}>
                      {guess.guess}
                    </span>
                  </div>
                  {!guess.isCorrect && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-600">Correct answer: </span>
                      <span className="text-green-700 font-medium">{guess.correct}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

SummaryComponent.displayName = 'SummaryComponent';

export default SummaryComponent;