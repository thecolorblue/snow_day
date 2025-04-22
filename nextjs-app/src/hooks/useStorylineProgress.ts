import { useState, useCallback, useMemo } from 'react';
import { Question } from '@prisma/client'; // Import Question type

interface AnswerState {
  [key: string]: string;
}

interface QuestionProgress {
  attempts: number;
  correct: boolean | null;
}

interface StorylineProgressState {
  [questionId: number]: QuestionProgress;
}

export const useStorylineProgress = (
  questions: Question[], // Add questions array as input
  initialProgress: StorylineProgressState = {},
  initialAnswers: AnswerState = {}
) => {
  const [progress, setProgress] = useState<StorylineProgressState>(() => {
    // Initialize progress with null correctness for all questions
    const initial: StorylineProgressState = {};
    questions.forEach(q => {
        initial[q.id] = {
            attempts: initialProgress[q.id]?.attempts || 0,
            correct: initialProgress[q.id]?.correct ?? null // Use provided initial correctness if available
        };
    });
    return initial;
  });
  const [answers, setAnswers] = useState<AnswerState>(initialAnswers);
  const [pageLoadTime] = useState(new Date()); // Added pageLoadTime state

  const incrementAttempts = useCallback((questionId: number) => {
    setProgress((prevProgress) => {
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
    return questions.every(q => progress[q.id]?.correct === true);
  }, [progress, questions]);

  const updateCorrectness = useCallback((questionId: number, isCorrect: boolean) => {
    setProgress(prevProgress => ({
      ...prevProgress,
      [questionId]: {
        ...prevProgress[questionId],
        attempts: prevProgress[questionId]?.attempts || 0, // Ensure attempts exists
        correct: isCorrect,
      },
    }));
  }, []);

  const handleInputChange = useCallback((questionId: number, value: string, correctAnswer: string) => {
    incrementAttempts(questionId);
    setAnswers(prev => ({ ...prev, [`question_${questionId}`]: value }));
    // Also update correctness status
    updateCorrectness(questionId, value.trim().toLowerCase() === correctAnswer.trim().toLowerCase());
  }, [updateCorrectness]);

  // Function to get correctness status for a specific question
  const getCorrectnessStatus = useCallback((questionId: number): boolean | null => {
    return progress[questionId]?.correct ?? null;
  }, [progress]);


  return { progress, answers, pageLoadTime, isValid, incrementAttempts, getAttempts, handleInputChange, getCorrectnessStatus }; // Return isValid
};

export default useStorylineProgress;