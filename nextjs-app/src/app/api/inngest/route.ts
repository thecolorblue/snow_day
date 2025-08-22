import { serve } from 'inngest/next';
import { inngest } from '@/app/inngest/client';
import { generateStory } from '@/app/inngest/functions';

// Create an API that serves your functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateStory,
  ],
});