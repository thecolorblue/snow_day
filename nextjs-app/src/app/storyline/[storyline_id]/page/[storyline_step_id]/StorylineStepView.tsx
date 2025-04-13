"use client"; // Mark as Client Component

import React, { useState, useEffect } from 'react';
import { Question } from '@prisma/client';
import { submitStorylineStepAction } from './actions'; // Import the server action

interface StorylineStepViewProps {
  storylineId: number;
  storylineStepId: number;
  storyId: number;
  storyHtml: string; // Already parsed HTML
  questions: Question[];
  // Add progress props later
}

export default function StorylineStepView({
  storylineId,
  storylineStepId,
  storyId,
  storyHtml,
  questions,
}: StorylineStepViewProps) {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitEnabled, setIsSubmitEnabled] = useState(false);

  // TODO: Implement client-side validation to enable submit button
  useEffect(() => {
    // Basic check: enable if all questions have some answer
    const allAnswered = questions.every(q => answers[`question_${q.id}`]?.trim());
    // More complex validation (like checking correctness for input type) can be added
    setIsSubmitEnabled(allAnswered);
  }, [answers, questions]);

  const handleInputChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [`question_${questionId}`]: value }));
    // TODO: Add time tracking logic here if needed
  };

  // Form submission handler using the Server Action
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    // Add pageLoadTime if needed (ensure pageLoadTime state/ref is implemented)
    // const pageLoadTime = // Get page load time value
    // formData.append('pageLoadTime', pageLoadTime.toString());

    try {
      // Call the server action, passing necessary IDs and form data
      const result = await submitStorylineStepAction(
        storylineId,
        storylineStepId,
        formData
      );

      // Handle the result from the server action
      console.log("Submission Result:", result);
      alert(`Submission successful! Score: ${result.score}/${result.totalQuestions}. ${result.message}`);
      // TODO: Implement confetti effect here based on result.score
      // TODO: Potentially update progress display or navigate

    } catch (error) {
      console.error("Submission failed:", error);
      alert(`Submission failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TODO: Implement Speech Synthesis/Recognition components/logic

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Story Panel */}
      <div className="md:w-1/2 space-y-4">
        <div className="card bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Story</h2>
          {/* Placeholder for Play Story button */}
          <button className="mb-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">Play Story (TODO)</button>
          {/* Render story HTML */}
          <div
            id="story-content"
            className="prose max-w-none" // Use prose for basic markdown styling
            dangerouslySetInnerHTML={{ __html: storyHtml }}
          />
          {/* Placeholder for audio element if needed */}
          {/* <audio controls src={`/media/assignment-${storyId}.mp3`}>Your browser does not support audio.</audio> */}
        </div>
        {/* Placeholder for Progress Info */}
        <div className="card bg-gray-100 p-4 rounded shadow">
          <h4 className="font-semibold text-gray-700">Previous Attempt (TODO)</h4>
          <p className="text-sm text-gray-600">Score: N/A</p>
          <p className="text-sm text-gray-600">Attempts: N/A</p>
        </div>
      </div>

      {/* Quiz Panel */}
      <div className="md:w-1/2">
        <form onSubmit={handleSubmit} className="card bg-white p-4 rounded shadow space-y-4">
          <h2 className="text-xl font-semibold mb-2">Quiz</h2>
          {questions.map((q, index) => (
            <div key={q.id} className="border p-3 rounded bg-gray-50">
              <p className="mb-2 font-medium">{q.question}</p>
              <div className="space-y-2">
                {q.type === 'input' && (
                  <div className="flex items-center space-x-2">
                    {/* Placeholder for Listen button */}
                     <button type="button" className="px-2 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600">Listen (TODO)</button>
                    <input
                      type="text"
                      id={`q_${q.id}_input`}
                      name={`question_${q.id}`} // Consistent naming for form data
                      required
                      autoComplete="off"
                      value={answers[`question_${q.id}`] || ''}
                      onChange={(e) => handleInputChange(q.id, e.target.value)}
                      // data-answer={q.correct} // For client-side validation if needed
                      className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                )}
                {q.type === 'select' && q.answers && (
                  q.answers.split(',').map((a, ansIndex) => (
                    <label key={ansIndex} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-100 cursor-pointer">
                      <input
                        type="radio"
                        id={`q_${q.id}_ans_${ansIndex}`}
                        name={`question_${q.id}`} // Same name for radio group
                        value={a}
                        required
                        checked={answers[`question_${q.id}`] === a}
                        onChange={(e) => handleInputChange(q.id, e.target.value)}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      />
                      <span className="text-sm">{a}</span>
                       {/* Placeholder for Play Word button */}
                       <button type="button" className="ml-auto px-2 py-0.5 bg-green-500 text-white rounded text-xs hover:bg-green-600">Play (TODO)</button>
                    </label>
                  ))
                )}
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={!isSubmitEnabled || isSubmitting}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answers'}
          </button>
        </form>
      </div>
    </div>
  );
}