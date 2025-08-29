"use client";

import { useEffect, useState } from 'react';
import { StoryPageController } from '@/components/StoryPageController';
import { Question, Story, StoryQuestion, StorylineStep } from '@prisma/client';

// Define the expected shape of the fetched data
type StorylineStepDetails = {
  storyline_step_id: number;
  storyline_id: number;
  step: number;
  story: Story & {
    story_question: (StoryQuestion & {
      question: Question;
    })[];
  };
};

type StorylineDetails = {
  steps: number;
  progress: {
    [step_number: number]: boolean;
  }
}

export interface StoryMap {
  type: string;
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32?: number;
  endOffsetUtf32?: number;
  timeline: StoryMap[];
}

function replace_substring(originalString: string, start: number = 0, end: number = 0, replacement: string) {
  if (end === 0) { end = originalString.length; }
  
  return originalString.substring(0, start) + replacement + originalString.substring(end);
}

// Mock functions for now - in a real implementation, these would be imported from the existing page.tsx
async function getStorylineDetails(storylineId: number): Promise<StorylineDetails | null> {
  // This would be implemented to fetch storyline details
  return { steps: 5, progress: {} };
}

async function getStorylineStepDetails(storylineId: number, storylineStep: number): Promise<StorylineStepDetails | null> {
  // This would be implemented to fetch storyline step details
  return null;
}

export default function MobileStorylineStepPage({ 
  params 
}: { 
  params: Promise<{
    storyline_id: string;
    storyline_step: string;
  }> 
}) {
  const [stepDetails, setStepDetails] = useState<StorylineStepDetails | null>(null);
  const [storylineDetails, setStorylineDetails] = useState<StorylineDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { storyline_id, storyline_step } = await params;
        const storylineId = parseInt(storyline_id, 10);
        const storylineStep = parseInt(storyline_step, 10);

        if (isNaN(storylineId) || isNaN(storylineStep)) {
          return;
        }

        // In a real implementation, we would call the actual functions
        // const stepDetails = await getStorylineStepDetails(storylineId, storylineStep);
        // const storylineDetails = await getStorylineDetails(storylineId);

        // For now, we'll mock the data
        const mockStepDetails: StorylineStepDetails = {
          storyline_step_id: 1,
          storyline_id: storylineId,
          step: storylineStep,
          story: {
            id: 1,
            content: "This is a sample story with some words that need to be highlighted.",
            audio: "/sample-audio.mp3",
            map: JSON.stringify([
              { type: "word", text: "sample", startTime: 0, endTime: 1, startOffsetUtf32: 0, endOffsetUtf32: 6 },
              { type: "word", text: "story", startTime: 1, endTime: 2, startOffsetUtf32: 10, endOffsetUtf32: 15 },
              { type: "word", text: "words", startTime: 2, endTime: 3, startOffsetUtf32: 16, endOffsetUtf32: 21 },
            ]),
            story_question: []
          }
        };

        const mockStorylineDetails: StorylineDetails = {
          steps: 5,
          progress: { 1: true, 2: false, 3: false, 4: false, 5: false }
        };

        setStepDetails(mockStepDetails);
        setStorylineDetails(mockStorylineDetails);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    }

    fetchData();
  }, [params]);

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!stepDetails || !storylineDetails) {
    return <div className="container mx-auto p-4">Error loading content</div>;
  }

  let markdown = stepDetails.story.content.replace(/\<play-word\>/g, '').replace(/<\/play-word>/g, '');
  const storyMap: StoryMap[] = stepDetails.story.map ? JSON.parse(stepDetails.story.map) : [];

  [...storyMap].reverse().forEach(({ text, startOffsetUtf32, endOffsetUtf32 }, i) => {
    markdown = replace_substring(markdown, startOffsetUtf32, endOffsetUtf32, `<span class="word-${storyMap.length - i - 1}">${text}</span>`);
  });

  // Parse story content from Markdown to HTML
  const storyHtml = markdown; // In a real implementation, we would use marked here

  // Extract questions from the nested structure
  const questions = stepDetails.story.story_question.map(sq => sq.question);

  return (
    <div className="container mx-auto p-4">
      <StoryPageController
        storylineId={stepDetails.storyline_id}
        storylineStep={stepDetails.step}
        storyHtml={storyHtml}
        storyAudio={stepDetails.story.audio}
        questions={questions}
        wordList={storyMap}
      />
    </div>
  );
}