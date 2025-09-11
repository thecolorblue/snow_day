'use client';

import React, { useState, useEffect } from 'react';
import AuthStatus from './AuthStatus';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

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
  pages: number;
  original_request: string | null;
}

interface FrontPageData {
  students: StudentStats[];
  vocabs: VocabStats[];
  storylines: StorylineStats[];
}

interface SDApplicationBarProps {
  app_name: string;
  primary_menu: {
    title: string,
    callback?: ()=> {},
    icon?: React.ReactNode,
    href?: string
  }[]
}

const SDApplicationBar = ({ app_name, primary_menu }: SDApplicationBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [frontPageData, setFrontPageData] = useState<FrontPageData | null>(null);
  const { data: session } = useSession();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    if (session?.user?.email && isMenuOpen) {
      fetchFrontPageData();
    }
  }, [session, isMenuOpen]);

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
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
      {/* Menu button (left aligned) */}
      <div className="flex items-center">
        <div className="relative">

          <button 
            onClick={toggleMenu}
            className="p-2 rounded hover:bg-gray-100 text-gray-700"
            aria-label="Open menu"
          >
            <Menu />
          </button>

          {/* Menu dropdown */}
          {isMenuOpen && (
            <div className="absolute top-16 left-4 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 max-h-96 overflow-y-auto">
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  console.log('Open document clicked');
                  setIsMenuOpen(false);
                }}
              >
                Open document
              </button>
              
              {/* Primary menu items */}
              {primary_menu && primary_menu.map(({ title, callback, icon, href }) => {
                if (href) {
                  // For links with href
                  return (
                    <Link
                      key={title}
                      href={href}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {icon && icon}
                      {title}
                    </Link>
                  );
                } else {
                  // For buttons with callbacks
                  return (
                    <button
                      key={title}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={()=> {
                        callback?.();
                        setIsMenuOpen(false);
                      }}
                    >
                      {icon && icon}
                      {title}
                    </button>
                  );
                }
              })}

              {/* Divider */}
              {frontPageData && (frontPageData.students.length > 0 || frontPageData.vocabs.length > 0) && (
                <div className="border-t border-gray-200 my-1"></div>
              )}

              {/* Students Section */}
              {frontPageData && frontPageData.students.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Students
                  </div>
                  {frontPageData.students.map((student) => (
                    <Link
                      key={student.id}
                      href="/storylines"
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{student.name}</span>
                        <span className="text-xs text-gray-500">
                          {student.completedStorylines} storylines
                        </span>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {/* Vocabularies Section */}
              {frontPageData && frontPageData.vocabs.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Vocabularies
                  </div>
                  {frontPageData.vocabs.map((vocab) => (
                    <Link
                      key={vocab.id}
                      href={`/vocab/${vocab.id}`}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{vocab.title}</span>
                        <span className="text-xs text-gray-500">
                          {vocab.numberOfWords} words
                        </span>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {/* Storylines Section (optional) */}
              {frontPageData && frontPageData.storylines.length > 0 && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Active Storylines
                  </div>
                  {frontPageData.storylines.slice(0, 3).map((storyline) => (
                    <Link
                      key={storyline.storyline_id}
                      href={`/storyline/${storyline.storyline_id}/page/1`}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div>
                        <div className="font-medium">{storyline.student_name}</div>
                        <div className="text-xs text-gray-500">
                          {storyline.pages} pages
                        </div>
                      </div>
                    </Link>
                  ))}
                  {frontPageData.storylines.length > 3 && (
                    <Link
                      href="/storylines"
                      className="block w-full text-left px-4 py-2 text-xs text-blue-600 hover:bg-gray-100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      View all storylines →
                    </Link>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* App name (centered) */}
      <h1 className="text-xl font-bold">{app_name}</h1>

      {/* User account icon (right aligned) */}
      <div className="flex items-center">
        <AuthStatus />
      </div>
    </div>
  );
};

export default SDApplicationBar;