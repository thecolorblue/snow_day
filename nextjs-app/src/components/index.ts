import dynamic from 'next/dynamic';

export const PlayWord = dynamic(() => import('./PlayButton').then((mod) => mod.PlayWord), {
  ssr: false,
});

export { default as AudioComponent } from './AudioComponent';
export { default as SpeedComponent } from './SpeedComponent';
export { default as SummaryComponent } from './SummaryComponent';
export { default as PageComponent } from './PageComponent';
export { default as StoryPageController } from './StoryPageController';
export { default as AppHeader } from './AppHeader';
export { QuestionsProvider, useQuestions, useQuestionController } from './QuestionsContext';