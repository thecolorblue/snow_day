import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { marked } from 'marked';
import { Question, Story, StoryQuestion, StorylineStep, StorylineProgress } from '@prisma/client';

// Import the mobile story view component
import MobileWrapper from './MobileWrapper';

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

export type StoryMap = {
  type: string;
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32?: number;
  endOffsetUtf32?: number;
  timeline: StoryMap[];
}

// Helper function to replace substring
function replace_substring(originalString: string, start: number = 0, end: number = 0, replacement: string) {
  if (end === 0) { end = originalString.length; }

  return originalString.substring(0, start) + replacement + originalString.substring(end);
}

async function getStorylineDetails(storylineId: number): Promise<StorylineDetails | null> {
  try {
    const storylineSteps = await prisma.storylineStep.findMany({
      where: {
        storyline_id: storylineId,
      },
      include: {
        storyline_progress: {
          select: { storyline_progress_id: true },
          take: 1,
        },
      },
      orderBy: {
        step: 'asc',
      },
    });

    if (!storylineSteps || storylineSteps.length === 0) {
      console.warn(`No steps found for storyline ID: ${storylineId}`);
      return null;
    }

    const totalSteps = storylineSteps.length;
    const progress: { [step_number: number]: boolean } = {};

    storylineSteps.forEach(step => {
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

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
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
        story: {
          include: {
            story_question: {
              include: {
                question: true,
              },
            },
          },
        },
      },
    });

    if (!stepDetails || !stepDetails.story) {
      return null;
    }

    if (stepDetails.story.story_question) {
      stepDetails.story.story_question.forEach(sq => {
        if (sq.question && sq.question.answers && typeof sq.question.answers === 'string') {
          const answersArray = sq.question.answers.split(',').map(ans => ans.trim()).filter(ans => ans);
          if (answersArray.length > 1) {
            const shuffledAnswers = shuffleArray(answersArray);
            sq.question.answers = shuffledAnswers.join(',');
          }
        }
      });
    }

    return stepDetails as unknown as StorylineStepDetails;

  } catch (error) {
    console.error(`Error fetching storyline step details for storyline ${storylineId}, step ${storylineStep}:`, error);
    return null;
  }
}
interface MobilePageProps {
  params: Promise<{
    storyline_id: string;
    storyline_step: string;
  }>;
}

export default async function MobileStorylineStepPage({ params }: MobilePageProps) {
  const { storyline_id, storyline_step } = await params;
  const storylineId = parseInt(storyline_id, 10);
  const storylineStep = parseInt(storyline_step, 10);

  if (isNaN(storylineId) || isNaN(storylineStep)) {
    notFound();
  }

  const stepDetails = await getStorylineStepDetails(storylineId, storylineStep);
  const storylineDetails = await getStorylineDetails(storylineId);

  if (!stepDetails) {
    notFound();
  }

  if (stepDetails.storyline_id !== storylineId) {
    console.warn(`Mismatch: Step ${storylineStep} belongs to storyline ${stepDetails.storyline_id}, not ${storylineId}`);
    notFound();
  }

  let markdown = stepDetails.story.content.replace(/\<play-word\>/g, '').replace(/<\/play-word>/g, '');
  const storyMap: StoryMap[] = stepDetails.story.map ? JSON.parse(stepDetails.story.map) : [];

  [...storyMap].reverse().forEach(({ text, startOffsetUtf32, endOffsetUtf32 }, i) => {
    markdown = replace_substring(markdown, startOffsetUtf32, endOffsetUtf32, `<span class="word-${storyMap.length - i - 1}">${text}</span>`);
  });

  let storyHtml = await marked(markdown || '');
  storyHtml = storyHtml.replace(/</g, '<').replace(/"/g, '"').replace(/>/g, '>');

  const questions = stepDetails.story.story_question.map(sq => sq.question);

  return (
    <div className="container mx-auto p-4">
      <div className="progress-navigation mb-4">
        <div className="flex justify-evenly">
          {Object.keys(storylineDetails?.progress || {}).map((v, i) => (
            <div key={v} className={storylineDetails?.progress[parseInt(v, 10)] ? 'progress complete' : 'progress'}>
              <Link href={`/storyline/${storylineId}/page/${v}`}>Page {v}</Link>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <Link href="/storylines" className="text-blue-600 hover:underline">
          ← Back to Storylines
        </Link>
        <h1 className="text-2xl font-bold mt-2">
          Storyline {storylineId} - Step {stepDetails.step} (Mobile)
        </h1>
      </div>

      <MobileWrapper
        storylineId={storylineId}
        storylineStep={storylineStep}
        textMap={storyMap}
        storyAudio={stepDetails.story.audio}
        storyHtml={storyHtml}
      />
    </div>
  );
}