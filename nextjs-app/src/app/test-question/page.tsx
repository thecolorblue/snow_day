'use client';

import React, { useEffect, useState } from 'react';
import '../../components/QuestionComponent';

export default function TestQuestionPage() {
  const [q1Answer, setQ1Answer] = useState<string | null>(null);
  useEffect(() => {
    // Handle the custom event from the Lit component
    const handleAnswerSelected = (event: CustomEvent<{ word: string; answer: string }>) => {
      if (event.detail.word === 'question') {
        setQ1Answer(event.detail.answer);
      }
      console.log('Answer selected:', event.detail);
      // alert(`You selected "${event.detail.answer}" for the word "${event.detail.word}"`);
    };

    // Add event listener to the document
    document.addEventListener('answer-selected', handleAnswerSelected as EventListener);

    return () => {
      document.removeEventListener('answer-selected', handleAnswerSelected as EventListener);
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Question Component</h1>
      <div className="space-y-4">
        <p>
          This is a test sentence with a{' '}
          {React.createElement('question-element', {
            word: 'question',
            state: q1Answer === null ? '': q1Answer === 'answer1'? 'correct': 'incorrect',
            answers: 'answer1, answer2, answer3, correct answer'
          })}
          {' '}word that should be clickable.
        </p>
        
        <p>
          Here's another sentence with a{' '}
          {React.createElement('question-element', {
            word: 'test',
            answers: 'option A, option B, option C'
          })}
          {' '}word to try.
        </p>
      </div>
    </div>
  );
}