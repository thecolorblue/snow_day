'use client';

import React, { useRef, useEffect } from 'react';
import { useQuestions } from './QuestionsContext';
import { AudioComponentRef } from './AudioComponent';
import { SummaryComponentRef, QuestionGuess } from './SummaryComponent';
import { PageComponentRef } from './PageComponent';
import { QuestionController } from './QuestionsContext';

interface StoryPageControllerProps {
  speedComponent: React.RefObject<HTMLElement | null>;
  audioComponent: React.RefObject<AudioComponentRef | null>;
  summaryComponent: React.RefObject<SummaryComponentRef | null>;
  pageComponent: React.RefObject<PageComponentRef | null>;
  onGuess: (question: string, guess: string, isCorrect: boolean) => void;
}

class StoryPageController {
  private speedComponent: React.RefObject<HTMLElement | null>;
  private audioComponent: React.RefObject<AudioComponentRef | null>;
  private summaryComponent: React.RefObject<SummaryComponentRef | null>;
  private pageComponent: React.RefObject<PageComponentRef | null>;
  private onGuess: (question: string, guess: string, isCorrect: boolean) => void;
  private questionController: QuestionController;
  private speedListeners: { onToggle: () => void; onSpeedUpdate: (speed: number) => void } | null = null;

  constructor(
    speedComponent: React.RefObject<HTMLElement | null>,
    audioComponent: React.RefObject<AudioComponentRef | null>,
    summaryComponent: React.RefObject<SummaryComponentRef | null>,
    pageComponent: React.RefObject<PageComponentRef | null>,
    questionController: QuestionController,
    onGuess: (question: string, guess: string, isCorrect: boolean) => void
  ) {
    this.speedComponent = speedComponent;
    this.audioComponent = audioComponent;
    this.summaryComponent = summaryComponent;
    this.pageComponent = pageComponent;
    this.questionController = questionController;
    this.onGuess = onGuess;
  }

  setupListeners() {
    this.setupSpeedListeners();
    this.setupAudioListeners();
    this.setupQuestionListeners();
    this.setupScrollListeners();
  }

  private setupSpeedListeners() {
    const audioComponent = this.audioComponent.current;
    if (!audioComponent) return;

    this.speedListeners = {
      onToggle: () => {
        if (audioComponent.isPlaying()) {
          audioComponent.pause();
        } else {
          audioComponent.play();
        }
      },
      onSpeedUpdate: (speed: number) => {
        audioComponent.updateSpeed(speed);
      }
    };
  }

  private setupAudioListeners() {
    // These are already set up in AudioComponent
    // But we could add additional handling here if needed
  }

  private setupQuestionListeners() {
    // We already handle this in QuestionsContext
    // But we can add additional orchestration here
  }

  private setupScrollListeners() {
    // Scroll handling is already in PageComponent
    // But we add pause/play logic here
  }

  // Method called from outside when a question is guessed
  handleGuess(question: string, guess: string, isCorrect: boolean) {
    this.onGuess(question, guess, isCorrect);

    const summaryComponent = this.summaryComponent.current;
    if (summaryComponent) {
      summaryComponent.update({
        question,
        guess,
        correct: isCorrect ? guess : '', // Need to get actual correct answer
        isCorrect
      });
    }

    if (this.questionController.allQuestionsCompleted()) {
      if (summaryComponent) {
        summaryComponent.show();
      }
    }
  }

  // Get speed component event handlers
  getSpeedHandlers() {
    return this.speedListeners;
  }

  // Cleanup
  destroy() {
    this.speedListeners = null;
  }
}

// React component wrapper to manage the controller instance
const StoryPageControllerWrapper: React.FC<StoryPageControllerProps> = ({
  speedComponent,
  audioComponent,
  summaryComponent,
  pageComponent,
  onGuess
}) => {
  const controllerRef = useRef<StoryPageController | null>(null);
  const { controller: questionController } = useQuestions();

  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new StoryPageController(
        speedComponent,
        audioComponent,
        summaryComponent,
        pageComponent,
        questionController,
        onGuess
      );
      controllerRef.current.setupListeners();
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, [speedComponent, audioComponent, summaryComponent, pageComponent, questionController, onGuess]);

  return null; // This component doesn't render anything
};

export { StoryPageControllerWrapper };
export default StoryPageController;