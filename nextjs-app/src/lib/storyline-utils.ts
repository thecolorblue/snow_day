import prisma from '@/lib/prisma';

// Local type definitions
interface Question {
  id: number;
  type: string;
  question: string;
  key: string;
  correct: string;
  answers: string | null;
  classroom: string;
}

interface Story {
  id: number;
  content: string;
  audio: string | null;
  map: string | null;
  story_question: StoryQuestion[];
}

interface StoryQuestion {
  id: number;
  story_id: number;
  question_id: number;
  question: Question;
}

export interface StorylineStepDetails {
  storyline_step_id: number;
  storyline_id: number;
  step: number;
  story: Story;
}

export interface StorylineDetails {
  steps: number;
  studentId: number;
  progress: {
    [step_number: number]: boolean;
  }
}

export async function getStorylineDetails(storylineId: number): Promise<StorylineDetails | null> {
  try {
    const [storylineSteps, storyline ] = await Promise.all([prisma.storylineStep.findMany({
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
    }), prisma.storyline.findFirst({ where: { storyline_id: storylineId }})]);

    if (!storylineSteps || storylineSteps.length === 0) {
      console.warn(`No steps found for storyline ID: ${storylineId}`);
      return null;
    }

    const totalSteps = storylineSteps.length;
    const progress: { [step_number: number]: boolean } = {};

    storylineSteps.forEach((step: any) => {
      progress[step.step] = step.storyline_progress.length > 0;
    });

    console.log(storyline);

    return {
      studentId: JSON.parse(storyline?.original_request || '').student_id || 0,
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

export async function getStorylineStepDetails(storylineId: number, storylineStep: number): Promise<StorylineStepDetails | null> {
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
      stepDetails.story.story_question.forEach((sq: any) => {
        if (sq.question && sq.question.answers && typeof sq.question.answers === 'string') {
          const answersArray = sq.question.answers.split(',').map((ans: string) => ans.trim()).filter((ans: string) => ans);
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

export async function getQuestionsForStorylineStep(storylineId: number, storylineStep: number): Promise<Question[]> {
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
      return [];
    }

    return stepDetails.story.story_question.map((sq: any) => sq.question);
  } catch (error) {
    console.error(`Error fetching questions for storyline ${storylineId}, step ${storylineStep}:`, error);
    return [];
  }
}