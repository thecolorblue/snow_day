"use client"; // Mark this as a Client Component

import React, { useState, useCallback } from 'react'; // Add useCallback
import { useRouter, usePathname, useSearchParams } from 'next/navigation'; // Import hooks
import { useFormStatus } from 'react-dom'; // Import useFormStatus for loading state
import { Student } from '@prisma/client'; // Import Student type
import { createStorylineAction } from './actions'; // Import the Server Action

// Type for vocab with student info
type VocabWithStudent = {
  id: number;
  list: string;
  title: string;
  createdAt: Date;
  student_vocab: {
    student: Student;
  }[];
};

// Define props for the component
interface StorylineFormProps {
  vocabs: VocabWithStudent[];
  genres: string[];
  locations: string[];
  styles: string[];
  interests: string[];
  friends: string[];
  students: Student[]; // Add students prop
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

// Submit button component that uses useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full px-4 py-2 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center ${
        pending
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {pending ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Creating Storyline...
        </>
      ) : (
        'Create Storyline'
      )}
    </button>
  );
}

export default function StorylineForm({
  vocabs,
  genres,
  locations,
  styles,
  interests: staticInterests, // Renamed from props
  friends: staticFriends,     // Renamed from props
  students,
}: StorylineFormProps) {
  // State for form fields - initialize as needed
  const [selectedVocab, setSelectedVocab] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  // Prepare options for multi-select randomizer
  const interestOptions = staticInterests.map(i => ({ value: i, text: i }));
  const friendOptions = staticFriends.map(f => ({ value: f, text: f }));

  // Auto-select student if only one exists
  React.useEffect(() => {
    if (students.length === 1 && !selectedStudent) {
      const student = students[0] as Student & { lexile?: string };
      setSelectedStudent(student.id.toString());
      // Set the lexile value in the style textarea
      if (student.lexile) {
        setSelectedStyle(student.lexile);
      }
    }
  }, [students, selectedStudent]);

  // Handle student selection change
  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId);
    if (studentId) {
      const student = students.find(s => s.id.toString() === studentId) as (Student & { lexile?: string }) | undefined;
      if (student && student.lexile) {
        setSelectedStyle(student.lexile);
      } else {
        setSelectedStyle('');
      }
    } else {
      setSelectedStyle('');
    }
  };

  // The form uses a Server Action (`createStorylineAction`), so no manual handleSubmit needed here.

  return (
    <form action={createStorylineAction} className="bg-white p-6 rounded-lg shadow-md space-y-6">
      {/* Student Selection */}
      <div>
        <label htmlFor="student" className="block text-sm font-medium text-gray-700 mb-1">Select Student:</label>
        <select
          id="student"
          name="selected_student"
          value={selectedStudent}
          onChange={(e) => handleStudentChange(e.target.value)}
          className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        >
          <option value="">-- Select a Student --</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Select the student this storyline is for.</p>
      </div>

      {/* Vocab Selection Dropdown */}
      <div>
        <label htmlFor="vocab" className="block text-sm font-medium text-gray-700 mb-1">Select Vocabulary List:</label>
        <select
          id="vocab"
          name="selected_vocab"
          value={selectedVocab}
          onChange={(e) => setSelectedVocab(e.target.value)}
          className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        >
          <option value="">-- Select a Vocabulary List --</option>
          {vocabs.map((vocab) => (
            <option key={vocab.id} value={vocab.id}>
              Vocab #{vocab.id}: {vocab.title} ({vocab.list.split(',').length} words)
              ({vocab.student_vocab.map(sv => sv.student.name).join(', ')})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Select a vocabulary list to generate stories from.</p>
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
        <textarea
          id="styles"
          name="styles"
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          placeholder="Describe the style you want for your story..."
          rows={3}
          className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-vertical"
        />
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
            {staticInterests.map(interest => <option key={interest} value={interest}>{interest}</option>)}
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
            {staticFriends.map(friend => <option key={friend} value={friend}>{friend}</option>)}
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

      <SubmitButton />
    </form>
  );
}