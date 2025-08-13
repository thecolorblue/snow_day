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

interface StoryMapWord {
  type: string;
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32?: number;
  endOffsetUtf32?: number;
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLMediaElement | null>(null);


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
      recognitionRef.current?.abort();
    };
  }, [answers, questions]); // Rerun if answers or questions change - Kept for cleanup logic
 
  // Effect to initialize Speech Recognition
  useEffect(() => {
     const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
     if (SpeechRecognitionAPI) {
       const recognitionInstance = new SpeechRecognitionAPI();
      //  const grammar = "#JSGF V1.0; grammar letters; public <letter> = a | b | c | d | e | f | g | h | i | j | k | l | m | n | o | p | q | r | s | t | u | v | w | x | y | z ;";
       // const speechRecognitionList = new SpeechGrammarList(); // Standard API
       // speechRecognitionList.addFromString(grammar, 1);
       // recognitionInstance.grammars = speechRecognitionList; // Standard API
       recognitionInstance.continuous = false;
       recognitionInstance.interimResults = false; // Process only final results
       recognitionInstance.lang = 'en-US';
 
      recognitionInstance.onstart = () => console.log('Speech recognition started');
      recognitionInstance.onend = () => console.log('Speech recognition ended');
      // Add explicit type for the error event
      recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          // Optionally provide more specific feedback based on event.error
          // e.g., 'network', 'no-speech', 'audio-capture', 'not-allowed', 'service-not-allowed', 'bad-grammar', 'language-not-supported'
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
              alert("Speech recognition permission denied. Please allow microphone access in your browser settings.");
          }
      };

      recognitionRef.current = recognitionInstance;
    } else {
      console.warn('Web Speech API (Recognition) is not supported by this browser.');
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("timeupdate", (event) => {
        
      });
    }
  }, [audioRef])


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
 
  // Component for the speech recognition button
  const ListenButton = ({ onTranscript }: { onTranscript: (transcript: string) => void }) => {
     const [isListening, setIsListening] = useState(false);
 
     const handleListen = useCallback(() => {
         if (!recognitionRef.current) {
             console.warn('Speech recognition not initialized.');
             return;
         }
 
        const recognition = recognitionRef.current;

        // Add explicit type for the result event
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let transcript = '';
            // Iterate through results (though continuous=false means only one final result)
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript;
                }
            }
            console.log('Transcript:', transcript);
            // Clean up transcript
            onTranscript(transcript.replace(/\s+/g, '').toLowerCase());
             setIsListening(false); // Stop listening visually after result
         };
 
         recognition.onstart = () => {
             console.log('Speech recognition actually started');
             setIsListening(true);
         };
 
         recognition.onend = () => {
             console.log('Speech recognition actually ended');
             setIsListening(false);
        };

        // Add explicit type for the error event
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            // Add user feedback for common errors
            if (event.error === 'no-speech') {
                alert("No speech detected. Please try speaking clearly.");
            } else if (event.error === 'audio-capture') {
                alert("Audio capture failed. Please ensure your microphone is working.");
            } else if (event.error === 'not-allowed') {
                 alert("Microphone access denied. Please allow access to use speech recognition.");
            }
             setIsListening(false);
         };
 
 
         if (isListening) {
             recognition.stop();
         } else {
             try {
                 recognition.start();
             } catch (e) {
                 // Handle cases where recognition might already be active or other errors
                 console.error("Error starting speech recognition:", e);
                 setIsListening(false); // Ensure state is correct if start fails
             }
         }
         // Toggle state immediately for responsiveness, though actual start/stop is async
         // setIsListening(!isListening); // Let events handle state changes for accuracy
 
     }, [isListening, onTranscript]);
 
     // Use mouse down/up like original? Or just click? Click is simpler for React.
     // Let's stick to click for now.
 
     return (
         React.createElement('md-filled-tonal-button' as any, { className: "button-listen", onClick: handleListen },
             React.createElement('svg', { xmlns: "http://www.w3.org/2000/svg", height: "24px", viewBox: "0 -960 960 960", width: "24px", fill: isListening ? '#ff0000' : '#4956e2' },
                 React.createElement('path', { d: "M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm0-240Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm40-360q17 0 28.5-11.5T520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480Z" })
             ),
             isListening ? 'Listening...' : ''
         )
     );
  };
 
  // QuestionLink component (if needed later)
  // const QuestionLink = ({ keyword }: { keyword: string }) => {
  //   const handleClick = () => {
  //     window.location.hash = keyword;
  //   };
  //   return <button onClick={handleClick} style={{ marginLeft: '5px', cursor: 'pointer' }}>?</button>;
  // };

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
