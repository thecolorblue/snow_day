'use client';

import React, { useState } from 'react';
import AuthStatus from './AuthStatus';
import { Menu } from 'lucide-react';
import Link from 'next/link';

interface SDApplicationBarProps {
  app_name: string;
  primary_menu: {
    title: string,
    callback?: ()=> {},
    icon?: React.ReactNode
    href?: string
  }[]
}

const SDApplicationBar = ({ app_name, primary_menu }: SDApplicationBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
            <div className="absolute top-16 left-4 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
              <button 
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => {
                  console.log('Open document clicked');
                  setIsMenuOpen(false);
                }}
              >
                Open document
              </button>
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