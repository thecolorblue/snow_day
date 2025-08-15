'use client';

import React, { useState, useEffect } from 'react';
import { Question } from '@prisma/client';
import useSpeechToText from 'react-hook-speech-to-text'; // Import the hook

interface STTQuestionProps {
  question: Question;
  currentAnswer: string | undefined;
  handleInputChange: (questionId: number, value: string, correctAnswer: string) => void;
  getCorrectnessStatus: (questionId: number) => boolean | null; // <-- Added prop
}

declare global {
  interface Window {
    webkitSpeechGrammarList: any;
  }
}



const STTQuestion: React.FC<STTQuestionProps> = ({
  question,
  currentAnswer,
  handleInputChange,
  getCorrectnessStatus, // <-- Destructure prop
}) => {
  const [inputValue, setInputValue] = useState<string>(currentAnswer || '');
  const isCorrect = getCorrectnessStatus(question.id); // <-- Get correctness status
  const grammar =
  "#JSGF V1.0; grammar alphabet; public <letters> = A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T | U | V | W | X | Y | Z ;";
  const speechRecognitionList = new window.webkitSpeechGrammarList();
  speechRecognitionList.addFromString(grammar, 1);

  const {
    error,
    // interimResult, // Not needed for final result processing
    isRecording,
    results,
    setResults,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true, // Stop recording after a pause
    useLegacyResults: false,
    timeout: 10000,
    crossBrowser: true,
    useOnlyGoogleCloud: true,
    googleApiKey: 'AIzaSyCvsyPU8Jo_c_EFAVB9NDWzBxW6aDfzoNo',
    googleCloudRecognitionConfig: {
      languageCode: 'en-US'
    },
    speechRecognitionProperties: {
      grammars: speechRecognitionList
    }
  });

  // Process the final result when it becomes available
  useEffect(() => {
    // Check if there are results and the last result is new
    // Check if there are results and the last result is new
    console.log(results)
    if (results.length > 0) {
      
      const processedTranscript = results
        .filter(r => typeof r === 'object' && r !== null && 'transcript' in r && r.transcript && r.transcript !== inputValue)
        .map(r => typeof r === 'string' ? r: r.transcript).join('').replace(/\s+/g, '');
      setInputValue(processedTranscript);
      handleInputChange(question.id, processedTranscript, question.correct || '');
    }
    // We only want to react to changes in the results array provided by the hook.
    // Adding other dependencies like inputValue or handleInputChange could cause loops.
  }, [results, question.id, question.correct, handleInputChange, inputValue]); // Added inputValue to prevent reprocessing same result

  const toggleListen = () => {
    if (isRecording) {
      stopSpeechToText();
    } else {
      setInputValue(''); // Clear previous input before starting new recognition
      setResults([]);
      startSpeechToText();
    }
  };

  // Handle manual input changes
  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const manualValue = e.target.value;
    setInputValue(manualValue);
    // If manual input should also trigger validation/saving:
    // handleInputChange(question.id, manualValue.replace(/\s+/g, ''), question.correct || '');
  };

  useEffect(() => {
    if (isCorrect) {
      stopSpeechToText();
    }
  }, [isCorrect]);

  // The hook handles browser compatibility via the error state
  if (error) {
    return (
       <div className="space-y-3 p-2">
         <p className="text-sm font-medium text-gray-700 mb-2">{question.question}</p>
         <p className="text-red-600">Speech recognition error: {error}</p>
         {/* Optionally provide a manual input fallback */}
         <input
           type="text"
           id={`q_${question.id}_stt_input_fallback`}
           name={`question_${question.id}`}
           value={inputValue}
           onChange={handleManualInputChange}
           placeholder="Enter answer manually..."
           className="flex-grow p-2 border border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
         />
       </div>
     );
  }

  // Render component if no error
  return (
    <div className="space-y-3 p-2">
      <p className="text-sm font-medium text-gray-700 mb-2">{question.question}</p>
      <div className="flex items-center space-x-2">
        <input
          type="text"
          id={`q_${question.id}_stt_input`}
          name={`question_${question.id}`}
          value={inputValue}
          onChange={handleManualInputChange}
          placeholder="Click the mic to speak..."
          className="flex-grow p-2 border border-gray-300 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          readOnly={isRecording} // Prevent manual input while recording
        />
        <button
          type="button"
          onClick={toggleListen}
          className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400 animate-pulse' // Add pulse animation
              : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
          } text-white transition duration-150 ease-in-out`}
          aria-label={isRecording ? 'Stop listening' : 'Start listening'}
        >
          {/* Mic Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>
      {/* Display interim results if desired */}
      {/* {interimResult && <p className="text-xs text-gray-500">Listening: {interimResult}</p>} */}
    </div>
  );
};

export default STTQuestion;