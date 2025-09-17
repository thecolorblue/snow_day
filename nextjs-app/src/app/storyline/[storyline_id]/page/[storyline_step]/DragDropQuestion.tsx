"use client"; // Mark as a Client Component

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Question } from '@prisma/client';
// import dragula from 'react-dragula'; // Remove static import
import 'dragula/dist/dragula.css'; // Import default Dragula CSS
// import { PlayWord } from '@/components';

interface DragDropQuestionProps {
  question: Question;
  currentAnswer: string | undefined; // Although not directly used for drag/drop state, keep for consistency
  handleInputChange: (questionId: number, value: string, correctAnswer: string) => void;
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffledArray = [...array];
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
  }
  return shuffledArray;
};

const DragDropQuestion: React.FC<DragDropQuestionProps> = ({
  question,
  handleInputChange,
}) => {
  const [lettersPool, setLettersPool] = useState<string[]>([]);
  const [wordInProgress, setWordInProgress] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);

  const lettersContainerRef = useRef<HTMLDivElement>(null);
  const wordContainerRef = useRef<HTMLDivElement>(null);
  const drakeRef = useRef<dragula.Drake | null>(null);

  const correctAnswer = question.correct;

  // Initialize letter pool based on answers and correct word frequency
  useEffect(() => {
    if (question && question.correct && question.answers) {
      const correctAnswer = question.correct;
      const availableAnswerLetters = question.answers.replace(/,/g, '').split(''); // Ensure only single letters

      // Calculate frequency of each letter needed for the correct answer
      const correctAnswerFreq: { [key: string]: number } = {};
      const availableLetterFreq: { [key: string]: number } = {};
      for (const char of correctAnswer) {
        correctAnswerFreq[char] = (correctAnswerFreq[char] || 0) + 1;
      }

      // Build the initial pool using letters from answers, respecting frequency
      const tempPool: string[] = [];
      for (const letter of availableAnswerLetters) {
        if (!availableLetterFreq[letter] && (availableLetterFreq[letter] || 0) <= (correctAnswerFreq[letter] || 0)) {
          tempPool.push(letter);
          availableLetterFreq[letter] = (availableLetterFreq[letter] || 0) + 1;
          // correctAnswerFreq[letter]--; // Decrement count for the used letter
        }
      }

      // Add any remaining required letters if answers didn't cover frequency (optional, depends on desired behavior)
      // Example: If correct is 'apple' and answers is 'a,p,l,e', add the second 'p'
      Object.entries(correctAnswerFreq).forEach(([letter, count]) => {
          for(let i = 0; i < count; i++) {
              if (!tempPool.includes(letter) || tempPool.filter(l => l === letter).length < (correctAnswer.split(letter).length - 1)) {
                 // This logic might need refinement depending on exact requirements
                 // For now, let's assume the primary source is availableAnswerLetters
              }
          }
      });


      setLettersPool(shuffleArray(tempPool)); // Shuffle the final pool
      setWordInProgress([]); // Start with empty word
      setIsCorrect(false); // Reset correctness
    } else {
      // Handle cases where question data might be incomplete
      setLettersPool([]);
      setWordInProgress([]);
      setIsCorrect(false);
    }
  // Depend on the entire question object to re-run if any relevant part changes
  }, [question]);

  // Check for correctness
  const checkCorrectness = useCallback((currentWord: string[]) => {
    const formedWord = currentWord.join('');
    const correct = formedWord === correctAnswer;
    setIsCorrect(correct);
    if (correct) {
      handleInputChange(question.id, formedWord, correctAnswer);
    }
    // If incorrect, but previously marked correct (e.g., user moves a letter out), update parent
    else if (formedWord !== correctAnswer && currentWord.length === correctAnswer.length) {
      handleInputChange(question.id, formedWord, correctAnswer);
    }
  }, [correctAnswer, question.id, handleInputChange]);


  // Setup Dragula
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component

    // Function to initialize Dragula
    const initDragula = async () => {
      if (typeof window !== 'undefined' && lettersContainerRef.current && wordContainerRef.current && !drakeRef.current) {
        try {
          const dragulaModule = await import('react-dragula');
          const dragula = dragulaModule.default;
          const containers = [lettersContainerRef.current!, wordContainerRef.current!];

          // Only proceed if still mounted after async import
          if (!isMounted) return;

          const drake = dragula(containers, {
            // Options if needed
          });

          drake.on('drop', (el: Element, target: Element, source: Element, sibling: Element | null) => {
            // Define color classes for convenience
            const correctClass = ['bg-green-500', 'text-white'];
            const wrongPositionClass = ['bg-orange-400', 'text-white'];
            const incorrectClass = ['bg-red-500', 'text-white'];
            const poolClass = ['bg-blue-100', 'border-blue-300'];
            const allColorClasses = [...correctClass, ...wrongPositionClass, ...incorrectClass, ...poolClass, 'border', 'border-gray-300', 'bg-gray-50']; // Include base styles if needed

            const wordContainer = wordContainerRef.current;
            const lettersContainer = lettersContainerRef.current;

            // --- Direct DOM Manipulation for Styling ---

            // 1. Reset style if element moved back to pool
            if (target === lettersContainer) {
              el.classList.remove(...allColorClasses);
              el.classList.add(...poolClass); // Apply default pool styling
            }

            // 2. Update styles for all elements currently in the word container
            if (wordContainer) {
                const wordElements = Array.from(wordContainer.children);
                wordElements.forEach((wordEl, index) => {
                    const letter = wordEl.textContent || '';
                    wordEl.classList.remove(...allColorClasses); // Clear previous styles

                    if (index < correctAnswer.length) {
                        if (correctAnswer[index] === letter) {
                            wordEl.classList.add(...correctClass);
                        } else if (correctAnswer.includes(letter)) {
                            wordEl.classList.add(...wrongPositionClass);
                        } else {
                            wordEl.classList.add(...incorrectClass); // Letter not in word
                        }
                    } else {
                         wordEl.classList.add(...incorrectClass); // Too many letters
                    }
                });
            }

            // --- Check Correctness based on DOM ---
            const currentWordElements = Array.from(wordContainer?.children || []);
            const formedWordArray = currentWordElements.map(e => e.textContent || '');
            checkCorrectness(formedWordArray); // Pass array as expected by checkCorrectness

            // --- DO NOT update React state for lists here ---
            // setLettersPool(...)
            // setWordInProgress(...)
          });

          drakeRef.current = drake; // Store the drake instance

        } catch (error) {
          console.error("Failed to load or initialize dragula:", error);
        }
      }
    };

    initDragula();

    // Cleanup function returned by useEffect
    return () => {
      isMounted = false; // Mark as unmounted
      if (drakeRef.current) {
        drakeRef.current.destroy();
        drakeRef.current = null;
      }
    };
    // Dependencies: checkCorrectness might change if question.id/handleInputChange change.
    // The refs (lettersContainerRef, wordContainerRef) are stable.
    // We only want to re-run setup if the core question logic changes, or on mount.
  }, [checkCorrectness]); // Rerun effect if checkCorrectness function identity changes


  // Determine letter color
  const getLetterColor = (letter: string, index: number): string => {
    if (isCorrect) return 'bg-green-500 text-white'; // All green if correct
    if (index >= correctAnswer.length) return 'bg-red-500 text-white'; // Should not happen with current logic
    if (correctAnswer[index] === letter) return 'bg-green-500 text-white'; // Correct letter, correct position
    if (correctAnswer.includes(letter)) return 'bg-orange-400 text-white'; // Correct letter, wrong position
    return 'bg-red-500 text-white'; // Incorrect letter (should not happen)
  };

  return (
    <div className="p-4">
       <style jsx>{`
        .gu-mirror { /* Dragula class for the dragged element mirror */
          position: fixed !important;
          margin: 0 !important;
          z-index: 9999 !important;
          opacity: 0.8;
          cursor: grabbing;
        }
        .gu-hide {
          display: none !important;
        }
        .gu-unselectable {
          user-select: none !important;
        }
        .gu-transit { /* Dragula class for the element being dragged */
          opacity: 0.5;
        }
        .letter-box {
          display: inline-block;
          padding: 8px 12px;
          margin: 4px;
          border: 1px solid #ccc;
          border-radius: 4px;
          cursor: grab;
          min-width: 40px; /* Ensure minimum width */
          text-align: center;
          font-weight: bold;
          user-select: none; /* Prevent text selection while dragging */
        }
        .drop-zone {
          border: 2px dashed #ccc;
          padding: 10px;
          margin-bottom: 10px;
          min-height: 60px; /* Ensure drop zone has height */
          background-color: #fafafa;
        }
      `}</style>

      {/* Word Drop Zone */}
      <div className="mb-4">
        {/* <PlayWord>{question.correct}</PlayWord> */}
        <div ref={wordContainerRef} className="drop-zone flex flex-wrap items-center">
          {wordInProgress.map((letter, index) => (
            <div
              key={`word-${index}-${letter}`} // Ensure key is unique enough
              className={`letter-box ${getLetterColor(letter, index)}`}
            >
              {letter}
            </div>
          ))}
        </div>
      </div>

      {/* Letters Pool Zone */}
      <div>
        <div ref={lettersContainerRef} className="drop-zone flex flex-wrap items-center">
          {lettersPool.map((letter, index) => (
            <div
              key={`pool-${index}-${letter}`} // Ensure key is unique enough
              className="letter-box bg-blue-100 border-blue-300"
            >
              {letter}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DragDropQuestion;