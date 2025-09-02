'use client';

import React from 'react';
import Link from 'next/link';
import SDApplicationBar from './SDApplicationBar';
import { BookOpen } from 'lucide-react';

const AppHeader = () => {
  return (
    <>
      <SDApplicationBar app_name="Snow Day" primary_menu={[
        {
          title: 'View Storylines',
          icon: <BookOpen />
        }
      ]}/>
      <div className="bg-gray-100 p-2 flex justify-end space-x-4">
        <Link href="/vocab" className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
          Vocab List
        </Link>
        <Link href="/vocab/create" className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">
          Create Vocab
        </Link>
      </div>
    </>
  );
};

export default AppHeader;