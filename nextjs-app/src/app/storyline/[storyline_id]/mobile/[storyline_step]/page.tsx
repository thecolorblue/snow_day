import { notFound } from 'next/navigation';
import { getStorylineStepDetails, getStorylineDetails, StoryMapWord } from '@/lib/storyline';
import StoryPageController from '@/components/storyline/StoryPageController';
import { QuestionsProvider } from '@/components/storyline/QuestionsContext';
import { marked } from 'marked';

// Define the props for the page component
interface PageProps {
  params: Promise<{
    storyline_id: string;
    storyline_step: string;
  }>;
}

function replace_substring(originalString: string, start: number = 0, end: number = 0, replacement: string) {
  if (end === 0) { end = originalString.length; }
  
  return originalString.substring(0, start) + replacement + originalString.substring(end);
}

export default async function StorylineStepMobilePage({ params }: PageProps) {
  const { storyline_id, storyline_step } = await params;
  const storylineId = parseInt(storyline_id, 10);
  const storylineStep = parseInt(storyline_step, 10);

  if (isNaN(storylineId) || isNaN(storylineStep)) {
    notFound(); // Return 404 if IDs are not valid numbers
  }

  const stepDetails = await getStorylineStepDetails(storylineId, storylineStep);
  const storylineDetails = await getStorylineDetails(storylineId);

  if (!stepDetails) {
    notFound(); // Return 404 if step details are not found
  }

  // Ensure the fetched step belongs to the correct storyline
  if (stepDetails.storyline_id !== storylineId) {
     console.warn(`Mismatch: Step ${storylineStep} belongs to storyline ${stepDetails.storyline_id}, not ${storylineId}`);
     notFound();
  }

  let markdown = stepDetails.story.content.replace(/\<play-word\>/g, '').replace(/<\/play-word>/g, '');

  const storyMap:StoryMapWord[] = stepDetails.story.map ? JSON.parse(stepDetails.story.map): [];

  [...storyMap].reverse().forEach(({ text, startOffsetUtf32, endOffsetUtf32 }, i) => {
    markdown = replace_substring(markdown, startOffsetUtf32, endOffsetUtf32, `<span class="word-${storyMap.length - i - 1}">${text}</span>`);
  })

  // Parse story content from Markdown to HTML
  let storyHtml = await marked(markdown || '');

  storyHtml = storyHtml.replace(/</g, '<').replace(/"/g, '"').replace(/>/g, '>')

  // Extract questions from the nested structure
  const questions = stepDetails.story.story_question.map((sq: any) => sq.question);

  return (
    <QuestionsProvider>
      <StoryPageController
        storyHtml={storyHtml}
        storyAudio={stepDetails.story.audio}
        wordList={storyMap}
        questions={questions}
      />
    </QuestionsProvider>
  );
}