'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import React from 'react';

interface Student {
  id: number;
  name: string;
}

function VocabCreateForm() {
  const searchParams = useSearchParams();
  const base_vocab = searchParams.get('base_vocab');
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [list, setList] = useState('');
  const [studentId, setStudentId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [baseVocabId, setBaseVocabId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStudents();
            
      if (base_vocab) {
        setBaseVocabId(base_vocab);
        fetchBaseVocab(base_vocab);
      }
    }
  }, [status, base_vocab]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // We can get students from the session data
      if (session?.guardian?.students) {
        setStudents(session.guardian.students);
        // Set default student to first one if available
        if (session.guardian.students.length > 0) {
          setStudentId(session.guardian.students[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load student list');
    } finally {
      setLoading(false);
    }
  };

  const fetchBaseVocab = async (vocabId: string) => {
    try {
      const response = await fetch(`/api/vocab/${vocabId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch base vocab');
      }
      
      const data = await response.json();
      setTitle(data.title);
      setList(data.list);
    } catch (err) {
      console.error('Error fetching base vocab:', err);
      setError('Failed to load base vocabulary');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !list || studentId === null) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/vocab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          list,
          studentId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create vocab');
      }

      // Redirect to the newly created vocab page
      const result = await response.json();
      router.push(`/vocab/${result.id}`);
    } catch (err) {
      console.error('Error creating vocab:', err);
      setError(err instanceof Error ? err.message : 'Failed to create vocab');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Please sign in to view this page</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading form...</div>
      </div>
    );
  }

  return (
    <>
    <AppHeader></AppHeader>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Create New Vocabulary</h1>
            <Link 
              href="/vocab" 
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Back to List
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter vocabulary title"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="list" className="block text-sm font-medium text-gray-700 mb-1">
                Words List *
              </label>
              <textarea
                id="list"
                rows={6}
                value={list}
                onChange={(e) => setList(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter words separated by commas (e.g., apple, banana, orange)"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="student" className="block text-sm font-medium text-gray-700 mb-1">
                Student *
              </label>
              <select
                id="student"
                value={studentId || ''}
                onChange={(e) => setStudentId(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-md text-white font-medium ${
                  isSubmitting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Vocabulary'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div></>
  );
}

export default function VocabCreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <VocabCreateForm />
    </Suspense>
  );
}