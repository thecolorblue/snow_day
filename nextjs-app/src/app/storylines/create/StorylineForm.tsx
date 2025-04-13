"use client"; // Mark this as a Client Component

import React, { useState } from 'react';
import { Question } from '@prisma/client'; // Import Question type
import { createStorylineAction } from './actions'; // Import the Server Action

// Define props for the component
interface StorylineFormProps {
  questions: Question[];
  genres: string[];
  locations: string[];
  styles: string[];
  interests: string[];
  friends: string[];
}

// Helper function for random selection in single-select dropdowns
const randomSelect = (options: string[]): string => {
  if (options.length === 0) return '';
  return options[Math.floor(Math.random() * options.length)];
};

// Helper function for random selection in multi-select dropdowns
const randomSelectMultiple = (options: { value: string; text: string }[]): string[] => {
    if (options.length === 0) return [];
    const randomCount = Math.floor(Math.random() * options.length) + 1;
    const shuffled = [...options].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, randomCount).map(opt => opt.value);
};


export default function StorylineForm({
  questions,
  genres,
  locations,
  styles,
  interests,
  friends,
}: StorylineFormProps) {
  // State for form fields - initialize as needed
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  // const [genTtl, setGenTtl] = useState<boolean>(true); // State for the checkbox if needed

  // Prepare options for multi-select randomizer
  const questionOptions = questions.map(q => ({ value: String(q.id), text: `${q.question} (Type: ${q.type}, Correct: ${q.correct})` }));
  const interestOptions = interests.map(i => ({ value: i, text: i }));
  const friendOptions = friends.map(f => ({ value: f, text: f }));

// The manual handleSubmit function was removed in the previous step.
// We will now update the form tag to use the server action.
  // Remove the manual handleSubmit function, as the form's action prop will handle submission

  return (
    <form action={createStorylineAction} className="bg-white p-6 rounded-lg shadow-md space-y-6">
      {/* Questions */}
      <div>
        <label htmlFor="questions" className="block text-sm font-medium text-gray-700 mb-1">Select Questions:</label>
        <div className="flex items-center space-x-2">
          <select
            id="questions"
            name="selected_questions" // Name matches form data key
            multiple
            value={selectedQuestions}
            onChange={(e) => setSelectedQuestions(Array.from(e.target.selectedOptions, option => option.value))}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            style={{ minHeight: '100px' }}
          >
            {questions.length > 0 ? (
              questions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.question} (Type: {question.type}, Correct: {question.correct})
                </option>
              ))
            ) : (
              <option disabled>No questions found for this classroom.</option>
            )}
          </select>
          <button
            type="button"
            onClick={() => setSelectedQuestions(randomSelectMultiple(questionOptions))}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Random
          </button>
        </div>
      </div>

      {/* Genre */}
      <div>
        <label htmlFor="genres" className="block text-sm font-medium text-gray-700 mb-1">Choose a Genre:</label>
        <div className="flex items-center space-x-2">
          <select
            id="genres"
            name="genres"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">--Select a Genre--</option>
            {genres.map(genre => <option key={genre} value={genre}>{genre}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setSelectedGenre(randomSelect(genres))}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Random
          </button>
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="locations" className="block text-sm font-medium text-gray-700 mb-1">Choose a Location:</label>
         <div className="flex items-center space-x-2">
          <select
            id="locations"
            name="locations"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">--Select a Location--</option>
            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setSelectedLocation(randomSelect(locations))}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Random
          </button>
        </div>
      </div>

      {/* Style */}
      <div>
        <label htmlFor="styles" className="block text-sm font-medium text-gray-700 mb-1">Choose a Style:</label>
        <div className="flex items-center space-x-2">
          <select
            id="styles"
            name="styles"
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">--Select a Style--</option>
            {styles.map(style => <option key={style} value={style}>{style}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setSelectedStyle(randomSelect(styles))}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Random
          </button>
        </div>
      </div>

      {/* Interests */}
      <div>
        <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">Choose Interests:</label>
        <div className="flex items-center space-x-2">
          <select
            id="interests"
            name="interests"
            multiple
            value={selectedInterests}
            onChange={(e) => setSelectedInterests(Array.from(e.target.selectedOptions, option => option.value))}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            style={{ minHeight: '100px' }}
          >
             {/* No default "--Select..." needed for multi-select usually */}
            {interests.map(interest => <option key={interest} value={interest}>{interest}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setSelectedInterests(randomSelectMultiple(interestOptions))}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Random
          </button>
        </div>
      </div>

      {/* Friends */}
      <div>
        <label htmlFor="friends" className="block text-sm font-medium text-gray-700 mb-1">Choose Friends:</label>
        <div className="flex items-center space-x-2">
          <select
            id="friends"
            name="friends"
            multiple
            value={selectedFriends}
            onChange={(e) => setSelectedFriends(Array.from(e.target.selectedOptions, option => option.value))}
            className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            style={{ minHeight: '80px' }}
          >
            {friends.map(friend => <option key={friend} value={friend}>{friend}</option>)}
          </select>
          <button
            type="button"
            onClick={() => setSelectedFriends(randomSelectMultiple(friendOptions))}
            className="px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
          >
            Random
          </button>
        </div>
      </div>

      {/* TTL Toggle - Example if needed */}
      {/* <div className="flex items-center">
        <input
          id="gen-ttl"
          name="gen_ttl"
          type="checkbox"
          checked={genTtl}
          onChange={(e) => setGenTtl(e.target.checked)}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label htmlFor="gen-ttl" className="ml-2 block text-sm text-gray-900">
          Enable TTL Generation (Example)
        </label>
      </div> */}

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Create Storyline
      </button>
    </form>
  );
}