'use client'
import React, { useState, useImperativeHandle, forwardRef } from 'react';

interface SummaryComponentProps {}

export interface SummaryComponentRef {
  update: (questionGuess: { question: string; correct: boolean }) => void;
  show: () => void;
}

const SummaryComponent = forwardRef<SummaryComponentRef, SummaryComponentProps>((props, ref) => {
  const [guesses, setGuesses] = useState<{ question: string; correct: boolean }[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    update(questionGuess) {
      setGuesses(prevGuesses => [...prevGuesses, questionGuess]);
    },
    show() {
      setIsOpen(true);
    }
  }));

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Summary</h2>
        <ul>
          {guesses.map((guess, index) => (
            <li key={index}>
              {guess.question}: {guess.correct ? 'Correct' : 'Incorrect'}
            </li>
          ))}
        </ul>
        <button onClick={() => setIsOpen(false)}>Close</button>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 5px;
        }
      `}</style>
    </div>
  );
});

SummaryComponent.displayName = 'SummaryComponent';
export default SummaryComponent;