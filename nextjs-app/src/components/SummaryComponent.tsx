'use client';

import React, { useState, useImperativeHandle, forwardRef } from 'react';

interface QuestionGuess {
  questionId: number;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

interface SummaryComponentProps {
  title?: string;
}

export interface SummaryComponentRef {
  update: (questionGuess: QuestionGuess) => void;
  show: () => void;
  hide: () => void;
}

const SummaryComponent = forwardRef<SummaryComponentRef, SummaryComponentProps>(
  ({ title = "Quiz Summary" }, ref) => {
    const [isVisible, setIsVisible] = useState(false);
    const [guesses, setGuesses] = useState<QuestionGuess[]>([]);

    useImperativeHandle(ref, () => ({
      update: (questionGuess: QuestionGuess) => {
        setGuesses(prev => {
          const existingIndex = prev.findIndex(g => g.questionId === questionGuess.questionId);
          if (existingIndex >= 0) {
            // Update existing guess
            const updated = [...prev];
            updated[existingIndex] = questionGuess;
            return updated;
          } else {
            // Add new guess
            return [...prev, questionGuess];
          }
        });
      },
      show: () => {
        setIsVisible(true);
      },
      hide: () => {
        setIsVisible(false);
      }
    }));

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setIsVisible(false);
      }
    };

    const correctCount = guesses.filter(g => g.isCorrect).length;
    const totalCount = guesses.length;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    if (!isVisible) return null;

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto">
            {/* Score Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {percentage}%
                </div>
                <div className="text-gray-600">
                  {correctCount} out of {totalCount} correct
                </div>
              </div>
            </div>

            {/* Question Details */}
            <div className="space-y-4">
              {guesses.map((guess, index) => (
                <div
                  key={guess.questionId}
                  className={`p-4 rounded-lg border ${
                    guess.isCorrect 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      guess.isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {guess.isCorrect ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium mb-2">{guess.question}</div>
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-gray-600">Your answer: </span>
                          <span className={guess.isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {guess.userAnswer}
                          </span>
                        </div>
                        {!guess.isCorrect && (
                          <div>
                            <span className="text-gray-600">Correct answer: </span>
                            <span className="text-green-700">{guess.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t bg-gray-50">
            <button
              onClick={() => setIsVisible(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
);

SummaryComponent.displayName = 'SummaryComponent';

export default SummaryComponent;