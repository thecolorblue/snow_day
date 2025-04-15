'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddStudentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    genre: '',
    location: '',
    style: '',
    interests: '', // Input as comma-separated string
    friends: '',   // Input as comma-separated string
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation (can be enhanced)
    if (!formData.genre || !formData.location || !formData.style) {
        setError('Genre, Location, and Style are required.');
        setIsLoading(false);
        return;
    }

    // Convert comma-separated strings to arrays
    const interestsArray = formData.interests.split(',').map(s => s.trim()).filter(s => s);
    const friendsArray = formData.friends.split(',').map(s => s.trim()).filter(s => s);

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...formData,
            interests: interestsArray,
            friends: friendsArray,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add student');
      }

      // Redirect to the students list page on success
      router.push('/students');
      // Optionally add a success message state or use toast notifications

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Add New Student</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow-md">
          <div>
            <label htmlFor="genre" className="block text-sm font-medium text-gray-700">Genre</label>
            <input
              type="text"
              id="genre"
              name="genre"
              value={formData.genre}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-700">Style</label>
            <input
              type="text"
              id="style"
              name="style"
              value={formData.style}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="interests" className="block text-sm font-medium text-gray-700">Interests (comma-separated)</label>
            <input
              type="text"
              id="interests"
              name="interests"
              value={formData.interests}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., coding, music, hiking"
            />
          </div>
           <div>
            <label htmlFor="friends" className="block text-sm font-medium text-gray-700">Friends (comma-separated)</label>
            <input
              type="text"
              id="friends"
              name="friends"
              value={formData.friends}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Alice, Bob, Charlie"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              isLoading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {isLoading ? 'Adding...' : 'Add Student'}
          </button>
        </form>
      </div>
    </main>
  );
}