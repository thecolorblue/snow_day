import prisma from '@/lib/prisma';

// Manually define types based on schema.prisma
export interface Story {
    id: number;
    content: string;
    audio: string | null;
    map: string | null;
    story_question: StoryQuestion[];
}

export interface Question {
    id: number;
    type: string;
    question: string;
    key: string;
    correct: string;
    answers: string | null;
    classroom: string;
}

export interface StoryQuestion {
    id: number;
    story_id: number;
    question_id: number;
    question: Question;
    story: Story;
}

export interface StorylineStep {
    storyline_step_id: number;
    storyline_id: number;
    step: number;
    story_id: number;
    story: Story;
}


// Define the expected shape of the fetched data
// Includes StorylineStep, its Story, and the Story's Questions via StoryQuestion
export type StorylineStepDetails = {
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

export type StorylineDetails = {
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

export type StoryMapWord = {
    text: string;
    startTime: number;
    endTime: number;
    startOffsetUtf32?: number;
    endOffsetUtf32?: number;
};

export async function getStorylineDetails(storylineId: number): Promise<StorylineDetails | null> {
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

    storylineSteps.forEach((step: any) => {
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

export async function getStorylineStepDetails(storylineId: number, storylineStep: number): Promise<StorylineStepDetails | null> {
  try {
    const stepDetails: any = await prisma.storylineStep.findFirst({
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
      stepDetails.story.story_question.forEach((sq: any) => {
        if (sq.question && sq.question.answers && typeof sq.question.answers === 'string') {
          const answersArray = sq.question.answers.split(',').map((ans: string) => ans.trim()).filter((ans: string) => ans); // Split, trim, remove empty
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