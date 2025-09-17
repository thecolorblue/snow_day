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
    </>
  );
};

export default AppHeader;