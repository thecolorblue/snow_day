import Tracker from '@openreplay/tracker';

let tracker: Tracker | null = null;

export function initOpenReplay() {
  if (typeof window === 'undefined') {
    return null; // Don't initialize on server side
  }

  if (tracker) {
    return tracker; // Return existing instance
  }

  // Initialize OpenReplay tracker
  tracker = new Tracker({
    projectKey: process.env.NEXT_PUBLIC_OPENREPLAY_PROJECT_KEY || '',
    // Add other configuration options as needed
    __DISABLE_SECURE_MODE: process.env.NODE_ENV === 'development',
  });

  return tracker;
}

export function startOpenReplaySession(metadata: {
  userId?: string;
  studentId?: number;
  storylineId?: number;
  guardianId?: number;
  pageId?: number;
}) {
  const tracker = initOpenReplay();
  
  if (!tracker) {
    console.warn('OpenReplay tracker not initialized');
    return;
  }

  try {
    // Start the session
    tracker.start();

    // Set user metadata for filtering
    if (metadata.userId) {
      tracker.setUserID(metadata.userId);
    }

    // Set custom metadata for filtering sessions
    if (metadata.studentId) {
      tracker.setMetadata('student_id', metadata.studentId.toString());
    }
    
    if (metadata.storylineId) {
      tracker.setMetadata('storyline_id', metadata.storylineId.toString());
    }

    if (metadata.guardianId) {
      tracker.setMetadata('guardian_id', metadata.guardianId.toString());
    }
    
    if (metadata.pageId) {
      tracker.setMetadata('page_id', metadata.pageId.toString());
    }

    console.log('OpenReplay session started with metadata:', metadata);
  } catch (error) {
    console.error('Error starting OpenReplay session:', error);
  }
}

export function stopOpenReplaySession() {
  if (tracker) {
    try {
      tracker.stop();
      console.log('OpenReplay session stopped');
    } catch (error) {
      console.error('Error stopping OpenReplay session:', error);
    }
  }
}

export { tracker };