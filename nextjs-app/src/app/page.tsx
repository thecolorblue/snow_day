"use client";

import { AppHeader } from "@/components";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import NewStudentForm from "./profile/NewStudentForm";
import { VocabProgress } from "@/lib/front-page-queries";

interface StudentStats {
  id: number;
  name: string;
  completedStorylines: number;
  correctAnswers: number;
}

interface VocabStats {
  id: number;
  title: string;
  numberOfWords: number;
}

interface StorylineStats {
  storyline_id: number;
  student_name: string;
  student_id: number;
  pages: number;
  original_request: string | null;
}

interface DemoStoryline {
  storyline_id: number;
  title: string;
  pages: number;
}

interface FrontPageData {
  students: StudentStats[];
  vocabs: VocabStats[];
  storylines: StorylineStats[];
  demoStorylines: DemoStoryline[];
  hasStorylineProgress: boolean;
  vocabProgress: VocabProgress[];
}

interface FormData {
  name: string;
  friends: string;
  interests: string;
  lexile: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [frontPageData, setFrontPageData] = useState<FrontPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [devEmail, setDevEmail] = useState('test@example.com');
  const [devName, setDevName] = useState('Test User');
  const [showDevAuth, setShowDevAuth] = useState(false);

  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (session?.user?.email) {
      fetchFrontPageData();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [session, status]);

  const fetchFrontPageData = async () => {
    try {
      const response = await fetch("/api/front-page");
      if (response.ok) {
        const data = await response.json();
        setFrontPageData(data);
      } else {
        console.error("Failed to fetch front page data");
      }
    } catch (error) {
      console.error("Error fetching front page data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDevSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn('dev-auth', {
      email: devEmail,
      name: devName,
      callbackUrl: '/',
    });
  };
 
  const handleCreateStudent = async (formData: FormData) => {
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateStudentModal(false);
        fetchFrontPageData(); // Refresh data
      } else {
        console.error('Failed to create student');
      }
    } catch (error) {
      console.error('Error creating student:', error);
    }
  };

  // Helper functions to determine user state
  const getUserState = () => {
    if (!frontPageData) return 'loading';
    
    const hasStudents = frontPageData.students.length > 0;
    const hasStorylines = frontPageData.storylines.length > 0;
    const hasProgress = frontPageData.hasStorylineProgress;
    
    if (!hasStudents) return 'no-student';
    if (!hasStorylines) return 'has-student-no-stories';
    if (!hasProgress) return 'has-student-stories-no-progress';
    return 'has-student-stories-progress';
  };

  const getStudentStorylines = (studentId: number) => {
    if (!frontPageData) return [];
    return frontPageData.storylines.filter(s => s.student_id === studentId);
  };


  if (status === "loading" || loading) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-4">Welcome to Snow Day Stories</h1>
              <p className="text-lg text-gray-600 mb-8">Please sign in to continue</p>
            </div>

            <div className="space-y-4">
              {/* Google Sign In */}
              <button
                onClick={() => signIn('google')}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>

              {/* Development Authentication */}
              {isDevelopment && (
                <div className="border-t pt-4">
                  <button
                    onClick={() => setShowDevAuth(!showDevAuth)}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 mb-4"
                  >
                    {showDevAuth ? 'Hide' : 'Show'} Development Login
                  </button>
                  
                  {showDevAuth && (
                    <form onSubmit={handleDevSignIn} className="space-y-4">
                      <div>
                        <label htmlFor="dev-email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          id="dev-email"
                          type="email"
                          value={devEmail}
                          onChange={(e) => setDevEmail(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="dev-name" className="block text-sm font-medium text-gray-700">
                          Name
                        </label>
                        <input
                          id="dev-name"
                          type="text"
                          value={devName}
                          onChange={(e) => setDevName(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Sign in (Development)
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  const userState = getUserState();

  const renderNoStudentState = () => (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="text-center mb-6">
          <p className="text-lg text-gray-700 mb-4">
            For a quick demo of the app, try out these two storylines. When you are done, try adding your student to your account.
          </p>
          <button
            onClick={() => setShowCreateStudentModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Create Student
          </button>
        </div>
        
        {frontPageData && frontPageData.demoStorylines.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {frontPageData.demoStorylines.map((storyline) => (
              <div key={storyline.storyline_id} className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Example Story</h3>
                <p className="text-sm text-gray-600 mb-3">{storyline.pages} pages</p>
                <Link
                  href={`/storyline/${storyline.storyline_id}/mobile/1`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Try Demo Storyline
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderHasStudentNoStoriesState = () => (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center mb-6">
          <p className="text-lg text-gray-700 mb-4 p-4">
            Now that you have added your student to your account you can also start creating stories for them to enjoy. A story is created by AI from a vocab list and some information from the student's profile.
          </p>
          <Link
            href="/storylines/create"
            className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            Create a Story for Your Student
          </Link>
        </div>
      </div>
    </div>
  );

  const renderHasStudentStoriesNoProgressState = () => {
    const student = frontPageData?.students[0];
    const studentStorylines = student ? getStudentStorylines(student.id) : [];
    
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="text-center mb-6">
            <p className="text-lg text-gray-700 mb-4">
              Give your device to the student or read the story together. Let them answer the questions at their own pace. Double clicking on a word will jump the audio to that spot. The vertical range bar on the right side adjusts the speed of the audio playback.
            </p>
            <Link
              href="/storylines/create"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Create a Story for Your Student
            </Link>
          </div>
        </div>
        
        {studentStorylines.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Storylines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentStorylines.map((storyline) => (
                <div key={storyline.storyline_id} className="border rounded-lg p-4">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-900 mb-1">
                      Student: {storyline.student_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {storyline.pages} pages
                    </p>
                  </div>
                  {storyline.original_request && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {storyline.original_request.length > 100
                        ? storyline.original_request.substring(0, 100) + "..."
                        : storyline.original_request}
                    </p>
                  )}
                  <Link
                    href={`/storyline/${storyline.storyline_id}/mobile/1`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Start Storyline
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHasStudentStoriesProgressState = () => {
    const student = frontPageData?.students[0];
    const studentStorylines = student ? getStudentStorylines(student.id) : [];
    
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="text-center mb-6">
            <p className="text-lg text-gray-700 mb-4">
              Keep generating new stories as much as you want, and see your student's progress learning their vocab list.
            </p>
            <Link
              href="/storylines/create"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Create Story
            </Link>
          </div>
        </div>
        
        {studentStorylines.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Student's Storylines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentStorylines.map((storyline) => (
                <div key={storyline.storyline_id} className="border rounded-lg p-4">
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-900 mb-1">
                      Student: {storyline.student_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {storyline.pages} pages
                    </p>
                  </div>
                  {storyline.original_request && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {storyline.original_request.length > 100
                        ? storyline.original_request.substring(0, 100) + "..."
                        : storyline.original_request}
                    </p>
                  )}
                  <Link
                    href={`/storyline/${storyline.storyline_id}/mobile/1`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Continue Storyline
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white shadow round-lg p-6">
          {/* Vocab Progress Bars */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">Vocabulary Progress</h3>
            {frontPageData?.vocabProgress.map((vocab) => (
              <div key={vocab.vocab_id} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Vocab {vocab.vocab_title}</span>
                  <span className="text-sm text-gray-500">{vocab.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${vocab.progress_percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gray-50 py-8">

        {userState === 'no-student' && renderNoStudentState()}
        {userState === 'has-student-no-stories' && renderHasStudentNoStoriesState()}
        {userState === 'has-student-stories-no-progress' && renderHasStudentStoriesNoProgressState()}
        {userState === 'has-student-stories-progress' && renderHasStudentStoriesProgressState()}
      </div>

      {/* New Student Modal */}
      <NewStudentForm
        isOpen={showCreateStudentModal}
        onClose={() => setShowCreateStudentModal(false)}
        onSubmit={handleCreateStudent}
      />
    </>
  );
}
