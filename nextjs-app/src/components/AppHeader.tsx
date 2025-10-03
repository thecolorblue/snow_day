'use client';

import React from 'react';
import Link from 'next/link';
import SDApplicationBar from './SDApplicationBar';
import { House } from 'lucide-react';

const AppHeader = () => {
  return (
    <>
      <SDApplicationBar app_name="Snow Day" primary_menu={[
        {
          title: 'Home Page',
          href: '/',
          icon: <House />
        }
      ]}/>
    </>
  );
};

export default AppHeader;