'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface VocabItem {
  id: number;
  title: string;
  list: string;
  createdAt: string;
  student_vocab: {
    student_id: number;
    student: {
      name: string;
    };
  }[];
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

export default function VocabViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [vocab, setVocab] = useState<VocabItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchVocab = async () => {
        try {
          const resolvedParams = await params;
          const vocabId = parseInt(resolvedParams.id);
          
          if (isNaN(vocabId)) {
            setError('Invalid vocab ID');
            setLoading(false);
            return;
          }
          
          const response = await fetch(`/api/vocab/${vocabId}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch vocab');
          }
          
          const data = await response.json();
          setVocab(data);
        } catch (err) {
          console.error('Error fetching vocab:', err);
          setError('Failed to load vocab');
        } finally {
          setLoading(false);
        }
      };
      
      fetchVocab();
    }
  }, [status, params]);

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
        <div className="text-lg">Loading vocab...</div>
      </div>
    );
  }

  if (error || !vocab) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-500">{error || 'Vocab not found'}</div>
      </div>
    );
  }

  // Split the list into individual words
  const words = vocab.list.split(',').map(word => word.trim()).filter(word => word.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Vocabulary Details</h1>
            <Link 
              href="/vocab" 
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Back to List
            </Link>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vocabulary Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Title</p>
                  <p className="text-lg font-medium text-gray-900">{vocab.title}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDate(vocab.createdAt)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Student</p>
                  <p className="text-lg font-medium text-gray-900">
                    {vocab.student_vocab[0]?.student.name || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vocabulary Words</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {words.map((word, index) => (
                  <div 
                    key={index} 
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center"
                  >
                    <p className="font-medium text-blue-900">{word}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Link 
                href={`/vocab/create?base_vocab=${vocab.id}`}
                className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Create New Vocab from "{vocab.title}"
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}