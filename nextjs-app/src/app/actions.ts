'use server';

import { getQuestionsForStorylineStep } from '@/lib/storyline-utils';

export async function fetchQuestionsForStep(storylineId: number, storylineStep: number) {
  return await getQuestionsForStorylineStep(storylineId, storylineStep);
}