import dynamic from 'next/dynamic';

export const PlayWord = dynamic(() => import('./PlayButton').then((mod) => mod.PlayWord), {
  ssr: false,
});

export { AudioComponent } from './AudioComponent';
export { SpeedComponent } from './SpeedComponent';
export { SummaryComponent } from './SummaryComponent';
export { PageComponent } from './PageComponent';
export { QuestionsProvider, useQuestions } from './QuestionsContext';