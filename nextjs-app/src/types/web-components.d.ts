import { Question } from '@prisma/client';

export interface StoryMapWord {
  type: string;
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32: number;
  endOffsetUtf32: number;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'story-content': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        markdown?: string;
        questions?: Question[];
        storyMap?: StoryMapWord[];
      };
    }
  }
}

export {};