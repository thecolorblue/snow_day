import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { marked } from 'marked';
import { QuestionComponent } from './QuestionComponent';
import { QuestionStatus } from './QuestionsContext';
import { StoryMap } from '@/app/storyline/[storyline_id]/page/[storyline_step]/page';

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

  constructor() {
    super();
    this._markdown = '';
    this._storyMap = [];
    this._questions = [];
    this._processedHtml = '';
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
        }));;
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
      const matchingQuestion = this._questions.find(({question: q }) => q.correct.toLowerCase() === text.toLowerCase());
      const classList = `class="word word-${this._storyMap.length - i - 1} ${matchingQuestion ? 'question-word' : ''}"`;
      
      if (matchingQuestion && matchingQuestion.question.answers) {
        processedMarkdown = replace_substring(
          processedMarkdown,
          startOffsetUtf32,
          endOffsetUtf32,
          `<question-element word="${text}" answers="${matchingQuestion.question.answers}">${text}</question-element>`
        );
      } else {
        processedMarkdown = replace_substring(
          processedMarkdown, 
          startOffsetUtf32, 
          endOffsetUtf32, 
          `<span ${classList} data-word-index="${this.storyMap.length - i - 1}">${text}</span>`
        );
      }
    });

    // Parse story content from Markdown to HTML
    let storyHtml = await marked(processedMarkdown || '');

    // Decode HTML entities
    storyHtml = storyHtml.replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&gt;/g, '>');

    this.processedHtml = storyHtml;
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
    const matchingQuestion = this._questions.find(q => q.question.correct === event.detail.word);

    if (matchingQuestion) {
      // this.dispatchEvent(new CustomEvent('question-guess', {
      //   detail: {
      //     questionId: matchingQuestion.id,
      //     answer: event.detail.answer
      //   },
      //   bubbles: true,
      //   composed: true
      // }));

      // Set the state on the target element to show correct/incorrect
      const target = event.target as HTMLElement;
      target.setAttribute('state', matchingQuestion.question.correct === event.detail.answer ? 'correct': 'incorrect');
    }
  };

  render() {
    return html`
      <div class="story-content" @scroll=${this.handleScroll} @answer-selected=${this.handleAnswerSelected}>
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