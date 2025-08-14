import { useState, useCallback, useMemo, useEffect } from 'react';
import { Question } from '@prisma/client'; // Import Question type from Prisma

// Define state types for clarity
type StorylineProgress = {
  attempts: number;
  correct: boolean | null;
};

type StorylineProgressState = {
  [questionId: number]: StorylineProgress;
};

type AnswerState = {
  [key: string]: string; // e.g., { 'question_1': 'answer text' }
};

export const useStorylineProgress = (
  questions: Question[], // Add questions array as input
  initialProgress: StorylineProgressState = {},
  initialAnswers: AnswerState = {}
) => {
  const [progress, setProgress] = useState<StorylineProgressState>({});
  const [answers, setAnswers] = useState<AnswerState>(initialAnswers);
  const [pageLoadTime] = useState(new Date()); // Added pageLoadTime state

  // Effect to initialize and update progress when questions or initialProgress change
  useEffect(() => {
    setProgress(prevProgress => {
      const newProgressState: StorylineProgressState = {};
      let hasChanged = false; // Flag to track changes

      // Build the potential new state
      questions.forEach(q => {
        const existingProgress = prevProgress[q.id];
        const initialQProgress = initialProgress[q.id];
        const currentAttempts = existingProgress?.attempts ?? initialQProgress?.attempts ?? 0;
        const currentCorrectness = existingProgress?.correct ?? initialQProgress?.correct ?? null;

        newProgressState[q.id] = {
          attempts: currentAttempts,
          correct: currentCorrectness
        };

        // Check if this entry differs from the previous state or if it's new
        if (!existingProgress || existingProgress.attempts !== currentAttempts || existingProgress.correct !== currentCorrectness) {
          hasChanged = true;
        }
      });

      // Check if any keys were removed (questions removed from the input array)
      const prevKeys = Object.keys(prevProgress).map(Number);
      const currentKeysSet = new Set(questions.map(q => q.id));
      if (prevKeys.some(key => !currentKeysSet.has(key))) {
          hasChanged = true;
      }

      // Only update state if something actually changed
      if (hasChanged) {
        // console.log("Progress state changed, updating.", newProgressState);
        return newProgressState;
      } else {
        // console.log("Progress state unchanged, skipping update.");
        return prevProgress; // Return the existing state object reference
      }
    });
  }, [questions, initialProgress]); // Rerun effect if questions or initialProgress change

  const incrementAttempts = useCallback((questionId: number) => {
    setProgress((prevProgress) => {
      // Ensure the question exists in progress before incrementing
      if (!prevProgress[questionId]) {
        console.warn(`Attempted to increment attempts for non-existent question ID: ${questionId}`);
        return prevProgress; // Or initialize it if preferred
      }
      const currentAttempts = prevProgress[questionId]?.attempts || 0;
      return {
        ...prevProgress,
        [questionId]: {
          ...prevProgress[questionId],
          attempts: currentAttempts + 1,
          correct: prevProgress[questionId]?.correct ?? null, // Preserve correctness status
        },
      };
    });
  }, []);

  // Function to get attempts for a specific question
  const getAttempts = useCallback((questionId: number): number => {
    return progress[questionId]?.attempts || 0;
  }, [progress]);

  // Calculate isValid based on current progress and questions
  const isValid = useMemo(() => {
    if (!questions || questions.length === 0) {
      return false; // No questions, not valid
    }
    // Check if progress has been initialized for all current questions
    const allQuestionsInitialized = questions.every(q => progress.hasOwnProperty(q.id));
    if (!allQuestionsInitialized) {
        return false; // Not all questions are in the progress state yet
    }
    return questions.every(q => progress[q.id]?.correct === true);
  }, [progress, questions]);

  const updateCorrectness = useCallback((questionId: number, isCorrect: boolean) => {
    setProgress(prevProgress => {
       // Ensure the question exists in progress before updating
       if (!prevProgress[questionId]) {
        console.warn(`Attempted to update correctness for non-existent question ID: ${questionId}`);
        return prevProgress; // Or initialize it if preferred
      }
      return {
        ...prevProgress,
        [questionId]: {
          ...prevProgress[questionId],
          attempts: prevProgress[questionId]?.attempts || 0, // Ensure attempts exists
          correct: isCorrect,
        },
      };
    });
  }, []);

  const handleInputChange = useCallback((questionId: number, value: string, correctAnswer: string) => {
    incrementAttempts(questionId);
    // Use a dynamic key for the specific question's answer
    setAnswers(prev => ({ ...prev, [`question_${questionId}`]: value }));
    // Also update correctness status
    updateCorrectness(questionId, value.trim().toLowerCase() === correctAnswer.trim().toLowerCase());
  }, [incrementAttempts, updateCorrectness]);

  // Function to get correctness status for a specific question
  const getCorrectnessStatus = useCallback((questionId: number): boolean | null => {
    return progress[questionId]?.correct ?? null;
  }, [progress]);


  return { progress, answers, pageLoadTime, isValid, incrementAttempts, getAttempts, handleInputChange, getCorrectnessStatus }; // Return isValid
};