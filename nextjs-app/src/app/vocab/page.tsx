'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface VocabItem {
  id: number;
  title: string;
  list: string;
  createdAt: string;
  student_name: string;
}

// Helper function to format date properly
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  
  // Try to parse the date string
  let date;
  
  // First try direct parsing (most common case)
  date = new Date(dateString);
  
  // If that fails, try to handle potential format issues
  if (isNaN(date.getTime())) {
    // Try parsing as a timestamp (if it's numeric)
    const timestamp = Date.parse(dateString);
    if (!isNaN(timestamp)) {
      date = new Date(timestamp);
    } else {
      // If still invalid, try to parse with more lenient approach
      // This handles cases where the date might be in a different format from DB
      const parsed = new Date(dateString.replace(/-/g, '/'));
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      } else {
        return 'Invalid Date';
      }
    }
  }
  
  // If we still have an invalid date, return error
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString();
};

export default function VocabListPage() {
  const { data: session, status } = useSession();
  const [vocabs, setVocabs] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchVocabs();
    }
  }, [status]);

  const fetchVocabs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vocab');
      
      if (!response.ok) {
        throw new Error('Failed to fetch vocabs');
      }
      
      const data = await response.json();
      setVocabs(data);
    } catch (err) {
      console.error('Error fetching vocabs:', err);
      setError('Failed to load vocab list');
    } finally {
      setLoading(false);
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
        <div className="text-lg">Loading vocab list...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Vocabulary List</h1>
            <Link 
              href="/vocab/create" 
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Create New Vocab
            </Link>
          </div>

          <div className="p-6">
            {vocabs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No vocabulary items found.</p>
                <Link 
                  href="/vocab/create" 
                  className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Create Your First Vocab
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vocabs.map((vocab) => (
                      <tr key={vocab.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{vocab.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{vocab.student_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(vocab.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link 
                            href={`/vocab/${vocab.id}`} 
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}