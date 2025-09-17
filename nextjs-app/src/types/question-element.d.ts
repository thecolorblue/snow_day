declare namespace JSX {
  interface IntrinsicElements {
    'question-element': {
      word?: string;
      answers?: string;
      showPopup?: boolean;
      onAnswerSelected?: (event: CustomEvent<{ word: string; answer: string }>) => void;
    };
  }
}