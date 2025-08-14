// nextjs-app/src/types/material-web.d.ts

// Declare Material Web components for JSX globally
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'play-word': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'md-filled-tonal-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'md-filled-tonal-icon-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        // Explicitly allow standard React style object plus custom properties
        style?: React.CSSProperties & { [key: `--${string}`]: string | number };
      };
      // Add other md-* elements if needed
    }
  }
}

// Export {} to make this a module file
export {};