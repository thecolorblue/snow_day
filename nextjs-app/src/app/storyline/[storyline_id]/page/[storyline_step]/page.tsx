import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { marked } from 'marked'; // Import marked for Markdown conversion
import StorylineStepView from './StorylineStepView'; // Client component for rendering
import { Question, Story, StoryQuestion } from '@prisma/client';

// Define the expected shape of the fetched data
// Includes StorylineStep, its Story, and the Story's Questions via StoryQuestion
type StorylineStepDetails = {
  storyline_step_id: number;
  storyline_id: number;
  step: number;
  story: Story & {
    story_question: (StoryQuestion & {
      question: Question;
    })[];
  };
  // TODO: Add progress data fetching if needed
};

async function getStorylineStepDetails(storylineId: number, storylineStep: number): Promise<StorylineStepDetails | null> {
  try {
    const stepDetails = await prisma.storylineStep.findFirst({
      where: {
        storyline_id: storylineId,
        step: storylineStep,
      },
      include: {
        story: { // Include the related story
          include: {
            story_question: { // Include the join table records
              include: {
                question: true, // Include the related question for each join record
              },
            },
          },
        },
        // Include storyline progress later if needed
        // storyline_progress: { ... }
      },
    });

    // Basic validation
    if (!stepDetails || !stepDetails.story) {
      return null;
    }

    // Type assertion might be needed if Prisma's inferred type isn't precise enough,
    // but usually includes work well. Let's assume it matches StorylineStepDetails for now.
    return stepDetails as unknown as StorylineStepDetails;

  } catch (error) {
    console.error(`Error fetching storyline step details for step ${storylineStep}:`, error);
    return null;
  }
}

interface StoryProgress {
  storyline_step_id: number;
  storyline_id: number;
  storyline_progress_id: number;
  story_question_id: number;
  duration: number | null;
  score: number | null;
  attempts: number | null;
  createdAt: Date | null;
}

async function getStorylineProgress(storylineId: number): Promise<StoryProgress[]> {
  return prisma.storylineProgress.findMany({
    where: {
      storyline_id: storylineId
    }
  });
}

// Define the props for the page component
interface PageProps {
  params: Promise<{
    storyline_id: string;
    storyline_step: string;
  }>;
}

export default async function StorylineStepPage({ params }: PageProps) {
  const { storyline_id, storyline_step } = await params;
  const storylineId = parseInt(storyline_id, 10);
  const storylineStep = parseInt(storyline_step, 10);

  if (isNaN(storylineId) || isNaN(storylineStep)) {
    notFound(); // Return 404 if IDs are not valid numbers
  }

  const stepDetails = await getStorylineStepDetails(storylineId, storylineStep);

  const storylineProgress = await getStorylineProgress(storylineId);

  if (!stepDetails) {
    notFound(); // Return 404 if step details are not found
  }

  // Ensure the fetched step belongs to the correct storyline
  if (stepDetails.storyline_id !== storylineId) {
     console.warn(`Mismatch: Step ${storylineStep} belongs to storyline ${stepDetails.storyline_id}, not ${storylineId}`);
     notFound();
  }

  // Parse story content from Markdown to HTML
  const storyHtml = await marked(stepDetails.story.content || '');

  // Extract questions from the nested structure
  const questions = stepDetails.story.story_question.map(sq => sq.question);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-evenly">
        <div><Link href={`/storyline/${storylineId}/page/1`}>Page 1</Link></div>
        <div><Link href={`/storyline/${storylineId}/page/2`}>Page 2</Link></div>
        <div><Link href={`/storyline/${storylineId}/page/3`}>Page 3</Link></div>
      </div>
      <div className="mb-4">
        <Link href="/storylines" className="text-blue-600 hover:underline">
          &larr; Back to Storylines
        </Link>
        <h1 className="text-2xl font-bold mt-2">Storyline {storylineId} - Step {stepDetails.step}</h1>
      </div>

      {/* Pass data to the Client Component */}
      <StorylineStepView
        storylineId={storylineId}
        storylineStep={storylineStep}
        storyId={stepDetails.story.id}
        storyHtml={storyHtml}
        questions={questions}
        // Pass progress data here later
      />
    </div>
  );
}