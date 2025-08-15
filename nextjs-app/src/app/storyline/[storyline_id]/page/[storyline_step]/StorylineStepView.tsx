"use client"; // Mark as Client Component

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Question } from '@prisma/client';
import { submitStorylineStepAction } from './actions'; // Import the server action
import confetti from 'canvas-confetti'; // Import confetti
import SelectQuestion from './SelectQuestion';
import DragDropQuestion from './DragDropQuestion';
import QuestionRenderer from './QuestionRenderer'; // Import the new renderer component
import { useStorylineProgress } from '@/hooks/useStorylineProgress';

// --- TypeScript Declarations for Custom Elements ---

// Allow slot attribute specifically for SVG elements in React
// (Keep this separate as it modifies React's SVG definition)
declare module 'react' {
   interface SVGProps<T> extends React.SVGAttributes<T>, React.ClassAttributes<T> {
       slot?: string;
   }
   // interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
   //   class?: string; // Already included, but being explicit can sometimes help
   // }
}

// Material Web component declarations are now in src/types/material-web.d.ts

// --- Component Props ---

export interface StoryMapWord {
  type: string;
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32: number;
  endOffsetUtf32: number;
}
interface StorylineStepViewProps {
  storylineId: number;
  storylineStep: number;
  storyId: number;
  storyHtml: string;
  storyAudio: string | null;
  questions: Question[];
  wordList: StoryMapWord[];
}

// --- Component ---
export default function StorylineStepView({
  storylineId,
  storylineStep,
  storyHtml,
  wordList,
  storyAudio,
  questions,
}: StorylineStepViewProps) {
  const { progress, answers, pageLoadTime, isValid, handleInputChange, getCorrectnessStatus } = useStorylineProgress(questions);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Component State & Refs ---
  const audioRef = useRef<HTMLMediaElement | null>(null);
  const highlightedWordIndexRef = useRef<number | null>(null);


  // --- Effects ---
  useEffect(() => {
    // Dynamically import Material Web Components on mount
    // Ensure these run only on the client side
    if (typeof window !== 'undefined') {
        import('@material/web/button/filled-tonal-button.js');
        import('@material/web/iconbutton/filled-tonal-icon-button.js');
        import('@material/web/icon/icon.js');
    }

    // Cleanup speech synthesis and recognition on unmount
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [answers, questions]); // Rerun if answers or questions change - Kept for cleanup logic

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !wordList) return;

    // Create a style element to hold the dynamic highlight style
    const styleElement = document.createElement('style');
    styleElement.id = 'highlight-style';
    document.head.appendChild(styleElement);

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      // Find the index of the word that should be highlighted
      const currentWordIndex = wordList.findIndex(word =>
        currentTime >= word.startTime && currentTime < word.endTime
      );

      // Only update if the word has changed
      if (currentWordIndex !== -1 && currentWordIndex !== highlightedWordIndexRef.current) {
        // Update the style element to highlight the new word
        styleElement.innerHTML = `
          .word-${currentWordIndex} {
            background-color: blue;
            color: white;
            transition: background-color 0.3s ease-in-out;
          }
        `;
        highlightedWordIndexRef.current = currentWordIndex;
      }
    };

    const handlePauseOrEnd = () => {
        // Clear the highlight when audio stops
        styleElement.innerHTML = '';
        highlightedWordIndexRef.current = null;
    }

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('pause', handlePauseOrEnd);
    audio.addEventListener('ended', handlePauseOrEnd);

    // Cleanup function to remove event listeners and the style element
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('pause', handlePauseOrEnd);
      audio.removeEventListener('ended', handlePauseOrEnd);
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [wordList]); // Rerun effect if wordList changes

  // Effect to style the words that are also question keywords
  useEffect(() => {
    if (!questions || !wordList) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'question-word-styles';
    document.head.appendChild(styleElement);

    const questionWordStyles = questions.map(question => {
      if (question.correct) {
        // Find the index of the word in wordList that matches the question correct
        const wordIndex = wordList.findIndex(word => word.text.toLowerCase() === question.correct.toLowerCase());
        if (wordIndex !== -1) {
          return `
            .word-${wordIndex} {
              text-decoration: underline;
              color: rgba(100, 100, 100, 0);
              text-decoration-color: #333;
            }
          `;
        }
      }
      return '';
    }).join('');

    styleElement.innerHTML = questionWordStyles;

    // Cleanup function to remove the style element
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [questions, wordList]);


  // Form submission handler using the Server Action
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const timeElapsed = (new Date().getTime() - pageLoadTime.getTime());
    formData.append('pageLoadTime', pageLoadTime.toISOString());
    formData.append('timeElapsed', timeElapsed.toString());
  
    Object.entries(progress).forEach(([questionId, questionProgress]) => {
      formData.append(`attempts_${questionId}`, questionProgress.attempts.toString());
    });

    try {
      // Call the server action, passing necessary IDs and form data
      const result = await submitStorylineStepAction(
        storylineId,
        storylineStep,
        formData
      );

      // Handle the result from the server action
      console.log("Submission Result:", result);
           // Trigger confetti!
           if (result.score > 0) {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
           }
           // TODO: Potentially update progress display or navigate based on result

    } catch (error) {
      console.error("Submission failed:", error);
      alert(`Submission failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };
 
  // Component to play a single word or phrase
  const PlayWordButton = ({ textToSpeak }: { textToSpeak: string }) => {
    const speakText = useCallback(() => {
      if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US';
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.volume = 1;
        utterance.onerror = (event) => console.error('Speech synthesis error:', event.error);
 
        window.speechSynthesis.cancel(); // Clear previous utterances
        window.speechSynthesis.speak(utterance);
      } else {
        console.warn('Speech synthesis not supported.');
      }
    }, [textToSpeak]);
 
    return (
      React.createElement('md-filled-tonal-icon-button' as any, { className: "button-play-word", onClick: speakText, style: { '--md-filled-tonal-icon-button-container-width': '48px', '--md-filled-tonal-icon-button-container-height': '48px' } },
         React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", height: "20px", viewBox: "0 0 24 24", width: "20px", fill: "currentColor" },
           React.createElement('path', { d: "M0 0h24v24H0z", fill: "none" }),
           React.createElement('path', { d: "M8 5v14l11-7z" })
         )
      )
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 storyline-step-view-font"> {/* Added class for specific font */}
      {/* Story Panel */}
      <div className="md:w-1/2 space-y-4">
        <div className="card bg-white p-4 rounded shadow">
                   <h2 className="text-xl font-semibold mb-2">Story</h2>
                   {/* Use the PlayStoryButton component */}
                   
                  {storyAudio && <audio controls ref={audioRef}>
                    <source src={storyAudio} type="audio/mpeg"></source>
                    Your browser does not support the audio element.
                  </audio>}
          {/* Render story HTML */}
          <div
            id="story-content"
            className="prose max-w-none" // Use prose for basic markdown styling
            dangerouslySetInnerHTML={{ __html: storyHtml }}
          />
          {/* Placeholder for audio element if needed */}
          {/* <audio controls src={`/media/assignment-${storyId}.mp3`}>Your browser does not support audio.</audio> */}
        </div>
      </div>

      {/* Quiz Panel */}
      <div className="md:w-1/2">
        <form onSubmit={handleSubmit} className="card bg-white p-4 rounded shadow space-y-4">
          {questions.map((q) => (
            <div
              key={q.id}
              className={`border relative p-3 rounded bg-gray-50 ${
                getCorrectnessStatus(q.id) === true ? 'correct bg-green-100 border-green-300' :
                getCorrectnessStatus(q.id) === false ? 'wrong bg-red-100 border-red-300' : ''
              }`} // Add dynamic classes
            >
              {/* <p className="mb-2 font-medium question-play-word"><PlayWordButton textToSpeak={q.correct} /></p> */}
              <div className="space-y-2">
                {/* Use QuestionRenderer to handle different question types */}
                <QuestionRenderer
                  question={q}
                  currentAnswer={answers[`question_${q.id}`]}
                  getCorrectnessStatus={getCorrectnessStatus} // Pass down the function
                  handleInputChange={handleInputChange}
                  // Note: If 'input' type needs ListenButton, QuestionRenderer needs adjustment
                  // or ListenButton needs to be passed down/refactored.
                />
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answers'}
          </button>
        </form>
      </div>
    </div>
  );
}
