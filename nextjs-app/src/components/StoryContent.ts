import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { marked } from 'marked';
import { QuestionComponent } from './QuestionComponent';
import { QuestionStatus } from './QuestionsContext';
import { StoryMap } from '@/app/storyline/[storyline_id]/page/[storyline_step]/page';
import sanitizeHtml from 'sanitize-html';

/**
 * A reusable double-tap detection utility that dispatches a custom 'doubletap' event.
 * @param {number} doubleTapMs - The maximum time (in ms) between taps to be considered a double-tap.
 */
function detectDoubleTap(doubleTapMs = 300) {
  let timeout: NodeJS.Timeout | null = null;
  let lastTap = 0;

  return function(event: Event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    // Check if the time between taps is within the doubleTapMs threshold
    if (tapLength > 0 && tapLength < doubleTapMs) {
      event.preventDefault();
      const doubleTap = new CustomEvent("doubletap", {
        bubbles: true,
        composed: true,
        detail: event
      });
      event.target?.dispatchEvent(doubleTap);
      // Clear the timeout to prevent a single tap from firing
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    } else {
      // Set a new timeout for a single tap
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      }, doubleTapMs);
    }
    lastTap = currentTime;
  };
}

export interface StoryMapWord {
  type: string;
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32: number;
  endOffsetUtf32: number;
}

export interface Question {
  id: number;
  question: string;
  type: string;
  key: string;
  correct: string;
  answers: string | null;
  classroom: string;
}

function replace_substring(originalString: string, start: number = 0, end: number = 0, replacement: string) {
  if (end === 0) { end = originalString.length; }
  
  return originalString.substring(0, start) + replacement + originalString.substring(end);
}

// Register the question-element component
if (!customElements.get('question-element')) {
  customElements.define('question-element', QuestionComponent);
}

@customElement('story-content')
export class StoryContent extends LitElement {
  static properties = {
    markdown: { type: String },
    questions: { type: Array },
    storyMap: { type: Array }
  }

  private _markdown: string;
  private _questions: Array<QuestionStatus>;
  private _storyMap: Array<StoryMap>;

  private _processedHtml: string;

  get processedHtml(): string {
    return this._processedHtml;
  }

  set processedHtml(value: string) {
    const oldValue = this._processedHtml;
    this._processedHtml = value;
    this.requestUpdate('processedHtml', oldValue);
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .story-content {
      overflow-y: auto;
      border-radius: 0.5rem;
      background-color: white;
      height: 100%;
      width: 100%;
    }

    .word {
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .word:hover {
      background-color: #f3f4f6;
    }

    .question-word {
      background-color: #fef3c7;
      border-radius: 0.25rem;
      padding: 0.125rem 0.25rem;
    }

    .question-word:hover {
      background-color: #fde68a;
    }

    question-element {
      display: inline;
      background-color: #fef3c7;
      border-radius: 0.25rem;
      padding: 0.125rem 0.25rem;
      cursor: pointer;
    }

    question-element:hover {
      background-color: #fde68a;
    }

.highlighted-word {
  background-color: blue;
  color: white;
}
  `;

  private _doubleTapHandler: (event: Event) => void;

  constructor() {
    super();
    this._markdown = '';
    this._storyMap = [];
    this._questions = [];
    this._processedHtml = '';
    // Create an instance of our custom double-tap detector
    this._doubleTapHandler = detectDoubleTap();
  }

  get markdown() {
    return this._markdown;
  }
  set markdown(md: string) {
    const oldMd = this._markdown;
    this._markdown = md;
    this.requestUpdate('markdown', oldMd);
  }

  get questions() {
    return JSON.stringify(this._questions.map(q => q.question));
  }
  set questions(qList: string | Array<Question>) {
    const oldList = this._questions;
    if (typeof qList === 'object') {
      this._questions = qList.map((q:Question) => ({
          id: q.id,
          question: q,
          status: 'pending' as const,
          userAnswer: undefined
        }));
    } else {
      try {
        this._questions = (JSON.parse(qList) || []).map((q:Question) => ({
          id: q.id,
          question: q,
          status: 'pending' as const,
          userAnswer: undefined
        }));

      } catch(e) {
        console.log(e)
      }

    }
    this.requestUpdate('questions', oldList);
  }

  get storyMap() {
    return JSON.stringify(this._storyMap);
  }
  set storyMap(sMap: string) {
    const oldMap = this._storyMap;
    if (typeof sMap === 'object') {
      this._storyMap = sMap
    } else {
      try {
        this._storyMap = JSON.parse(sMap);
      } catch(e) {
        console.log(e);
      }
    }
    this.requestUpdate('storyMap', oldMap);
  }


  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has('markdown') || changedProperties.has('questions') || changedProperties.has('storyMap')) {
      this.processContent();
    }
  }

  private async processContent() {
    if (!this.markdown) {
      this.processedHtml = '';
      return;
    }

    let processedMarkdown = this.markdown.replace(/\<play-word\>/g, '').replace(/<\/play-word>/g, '');

    // Process story map words in reverse order
    [...this._storyMap].reverse().forEach(({ text, startOffsetUtf32, endOffsetUtf32 }, i) => {
      const matchingQuestion = this._questions.find(({question: q }) => text.toLowerCase().includes(q.correct.toLowerCase()));
      const wordIndex = this._storyMap.length - i - 1;
      const classList = `class="word word-${wordIndex} ${matchingQuestion ? 'question-word' : ''}"`;
      
      if (matchingQuestion && matchingQuestion.question.answers) {
        processedMarkdown = replace_substring(
          processedMarkdown,
          startOffsetUtf32,
          endOffsetUtf32,
          `<question-element word="${matchingQuestion.question.correct.toLowerCase()}" answers="${matchingQuestion.question.answers}" data-word-index="${this._storyMap.length - i - 1}">${text}</question-element>`
        );
      } else {
        processedMarkdown = replace_substring(
          processedMarkdown,
          startOffsetUtf32,
          endOffsetUtf32,
          `<span ${classList} data-word-index="${this._storyMap.length - i - 1}">${text}</span>`
        );
      }
    });

    // Parse story content from Markdown to HTML
    let storyHtml = await marked(processedMarkdown || '');

    // Decode HTML entities
    storyHtml = storyHtml.replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&gt;/g, '>');

    this.processedHtml = storyHtml;
    
    // Add double-tap listeners to word elements after content is processed
    this._addWordEventListeners();
  }

  private _addWordEventListeners() {
    // Wait for the next frame to ensure DOM is updated
    requestAnimationFrame(() => {
      const wordElements = this.shadowRoot?.querySelectorAll('.word, question-element');
      wordElements?.forEach(element => {
        element.addEventListener('pointerup', this._doubleTapHandler);
        element.addEventListener('doubletap', this._handleDoubleTap);
      });
    });
  }

  private _removeWordEventListeners() {
    const wordElements = this.shadowRoot?.querySelectorAll('.word, question-element');
    wordElements?.forEach(element => {
      element.removeEventListener('pointerup', this._doubleTapHandler);
      element.removeEventListener('doubletap', this._handleDoubleTap);
    });
  }

  connectedCallback() {
    super.connectedCallback();
    // We'll add listeners to individual word elements after content is processed
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up event listeners from word elements
    this._removeWordEventListeners();
  }

  protected firstUpdated() {
    this.addEventListener('scroll', this.handleScroll);
  }

  private handleScroll = (event: Event) => {
    // Dispatch a custom event that can be listened to by parent components
    this.dispatchEvent(new CustomEvent('story-scroll', {
      detail: {
        scrollTop: (event.target as HTMLElement).scrollTop,
        scrollHeight: (event.target as HTMLElement).scrollHeight,
        clientHeight: (event.target as HTMLElement).clientHeight
      },
      bubbles: true
    }));
  };

  private handleAnswerSelected = (event: CustomEvent<{ word: string; answer: string }>) => {
    const matchingQuestion = this._questions.find(q => q.question.correct.toLowerCase() === event.detail.word.toLowerCase());

    if (matchingQuestion) {
      this.dispatchEvent(new CustomEvent('question-guess', {
        detail: {
          questionId: matchingQuestion.id,
          answer: event.detail.answer
        },
        bubbles: true,
        composed: true
      }));

      // Set the state on the target element to show correct/incorrect
      const target = event.target as HTMLElement;
      target.setAttribute('state', matchingQuestion.question.correct === event.detail.answer ? 'correct': 'incorrect');
    }
  };

  private _handleDoubleTap = (event: Event) => {
    const customEvent = event as CustomEvent;
    const originalEvent = customEvent.detail as PointerEvent;
    const target = originalEvent.target as HTMLElement;
    
    // The target should already be the word element since we attached listeners directly to them
    const wordElement = target;
    
    if (wordElement && wordElement.hasAttribute('data-word-index')) {
      const wordIndex = parseInt(wordElement.getAttribute('data-word-index') || '0', 10);
      
      // Dispatch the story-select-word event with the word index
      this.dispatchEvent(new CustomEvent('story-select-word', {
        detail: {
          wordIndex: wordIndex
        },
        bubbles: true,
        composed: true
      }));
    }
  };

  render() {
    return html`
      <div class="story-content" @answer-selected=${this.handleAnswerSelected}>
        <div .innerHTML=${this.processedHtml}></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'story-content': StoryContent;
  }
}