'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { startOpenReplaySession, stopOpenReplaySession } from '@/lib/openreplay';

interface OpenReplayWrapperProps {
  storylineId: number;
  storylineStep: number;
  studentId?: number;
  children: React.ReactNode;
}

export default function OpenReplayWrapper({ 
  storylineId, 
  storylineStep, 
  studentId,
  children 
}: OpenReplayWrapperProps) {
  const { data: session } = useSession();

  useEffect(() => {
    // Only start OpenReplay if we have the required data
    if (storylineId && storylineStep) {
      const metadata = {
        userId: session?.user?.email || undefined,
        guardianId: session?.guardian?.id,
        studentId: studentId,
        storylineId: storylineId,
        pageId: storylineStep,
      };

      // Start OpenReplay session with metadata
      startOpenReplaySession(metadata);

      // Cleanup function to stop session when component unmounts
      return () => {
        stopOpenReplaySession();
      };
    }
  }, [storylineId, storylineStep, studentId, session?.user?.email]);

  return <>{children}</>;
}