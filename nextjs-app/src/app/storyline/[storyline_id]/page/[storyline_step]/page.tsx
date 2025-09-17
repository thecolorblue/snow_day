import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import StorylineStepView, { StoryMapWord } from './StorylineStepView'; // Client component for rendering
import { Question, Story, StoryQuestion, StorylineStep, StorylineProgress } from '@prisma/client'; // Import necessary types
import StoryContentWrapper from '@/components/StoryContentWrapper'; // Import the wrapper component
import { QuestionsProvider } from '@/components/QuestionsContext'; // Import the QuestionsProvider

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


async function getStorylineDetails(storylineId: number): Promise<StorylineDetails | null> {
  try {
    // Fetch all steps for the storyline, including their progress records
    const storylineSteps = await prisma.storylineStep.findMany({
      where: {
        storyline_id: storylineId,
      },
      include: {
        // Include progress to check if any exists for each step
        storyline_progress: {
          select: { storyline_progress_id: true }, // Only need to know if records exist
          take: 1, // Optimize: only need one record to confirm progress exists
        },
      },
      orderBy: {
        step: 'asc', // Ensure steps are ordered
      },
    });

    if (!storylineSteps || storylineSteps.length === 0) {
      console.warn(`No steps found for storyline ID: ${storylineId}`);
      return null; // Or return a default state like { steps: 0, progress: {} }
    }

    const totalSteps = storylineSteps.length;
    const progress: { [step_number: number]: boolean } = {};

    storylineSteps.forEach(step => {
      // Check if the storyline_progress array has any elements
      progress[step.step] = step.storyline_progress.length > 0;
    });

    return {
      steps: totalSteps,
      progress: progress,
    };

  } catch (error) {
    console.error(`Error fetching storyline details for storyline ID ${storylineId}:`, error);
    return null;
  }
}


// Helper function to shuffle an array (moved inside or defined elsewhere if needed globally)
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

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
    // Randomize the order of answers for each question
    if (stepDetails.story.story_question) {
      stepDetails.story.story_question.forEach(sq => {
        if (sq.question && sq.question.answers && typeof sq.question.answers === 'string') {
          const answersArray = sq.question.answers.split(',').map(ans => ans.trim()).filter(ans => ans); // Split, trim, remove empty
          if (answersArray.length > 1) {
            const shuffledAnswers = shuffleArray(answersArray);
            sq.question.answers = shuffledAnswers.join(',');
          }
        }
      });
    }

// Type assertion might be needed if Prisma's inferred type isn't precise enough,
// but usually includes work well. Let's assume it matches StorylineStepDetails for now.
// Note: Ensure StorylineStepDetails type definition aligns with the structure returned by Prisma,
// especially after modifications like shuffling answers.
return stepDetails as unknown as StorylineStepDetails; // Consider refining the type assertion if possible

  } catch (error) {
    console.error(`Error fetching storyline step details for storyline ${storylineId}, step ${storylineStep}:`, error);
    return null;
  }
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
  const storylineDetails = await getStorylineDetails(storylineId);

  if (!stepDetails) {
    notFound(); // Return 404 if step details are not found
  }

  // Ensure the fetched step belongs to the correct storyline
  if (stepDetails.storyline_id !== storylineId) {
     console.warn(`Mismatch: Step ${storylineStep} belongs to storyline ${stepDetails.storyline_id}, not ${storylineId}`);
     notFound();
  }

  const markdown = stepDetails.story.content;
  const storyMap:StoryMapWord[] = stepDetails.story.map ? JSON.parse(stepDetails.story.map): [];

  // Extract questions from the nested structure
  const questions = stepDetails.story.story_question.map(sq => sq.question);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-evenly">
        {Object.keys(storylineDetails?.progress || {}).map((v, i)=>(
          <div key={v} className={storylineDetails?.progress[parseInt(v, 10)] ? 'progress': ''}><Link href={`/storyline/${storylineId}/page/${v}`}>Page {v}</Link></div>
        ))}
      </div>
      <div className="mb-4">
        <Link href="/storylines" className="text-blue-600 hover:underline">
          &larr; Back to Storylines
        </Link>
        <h1 className="text-2xl font-bold mt-2">Storyline {storylineId} - Step {stepDetails.step}</h1>
      </div>

      {/* Wrap with QuestionsProvider for the new component */}
      <QuestionsProvider>
        <StoryContentWrapper
          markdown={markdown}
          questions={questions.slice().sort(() => Math.random() - 0.5)}
          storyMap={storyMap}
        />
      </QuestionsProvider>

      {/* Keep the original StorylineStepView for other functionality if needed */}
      <StorylineStepView
        storylineId={storylineId}
        storylineStep={storylineStep}
        storyId={stepDetails.story.id}
        wordList={storyMap}
        storyAudio={stepDetails.story.audio}
        storyHtml=""
        questions={questions.slice().sort(() => Math.random() - 0.5)}
        // Pass progress data here later
      />
    </div>
  );
}