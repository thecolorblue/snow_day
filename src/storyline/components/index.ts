import dynamic from 'next/dynamic';

export const PlayStory = dynamic(() => import('./PlayButton').then((mod) => mod.PlayStory), {
  ssr: false,
});

export const PlayWord = dynamic(() => import('./PlayButton').then((mod) => mod.PlayWord), {
  ssr: false,
});