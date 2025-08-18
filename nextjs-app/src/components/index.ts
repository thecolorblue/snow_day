import dynamic from 'next/dynamic';

export const PlayWord = dynamic(() => import('./PlayButton').then((mod) => mod.PlayWord), {
  ssr: false,
});