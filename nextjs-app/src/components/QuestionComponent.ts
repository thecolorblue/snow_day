import { LitElement, html, css } from 'lit';

export class QuestionComponent extends LitElement {
  static properties = {
    word: { type: String },
    answers: { type: String },
    showPopup: { type: Boolean },
    state: { type: String }
  };

  private _word: string;
  private _answers: string;
  private _showPopup: boolean;
  private _state: string;
  private popupPosition: 'top' | 'middle' | 'bottom';

  static styles = css`
    :host {
      display: inline;
      position: relative;
    }

    .question-word {
      color: rgba(100, 100, 100, 0);
      text-decoration: underline;
      text-decoration-color: black;
      cursor: pointer;
    }

    .question-word.highlighted-word {
      color: #00f !important;
    }

    .question-word:hover {
      background: black;
    }

    .question-word.correct {
      color: blue !important;
      text-decoration: none;
    }

    .question-word.incorrect {
      color: rgba(100, 100, 100, 0);
      text-decoration-color: red;
    }

    .popup {
      position: absolute;
      left: inherit;
      right: -1px;
      padding: 0 8px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      z-index: 10;
      width: fit-content;
    }

    .popup.bottom {
      top: 100%;
    }

    .popup.top {
      bottom: 100%;
    }

    .popup h4 {
      font-weight: 500;
      margin-bottom: 8px;
      margin-top: 0;
    }

    .answers {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .answer-button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 8px;
      border-radius: 4px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 1.4rem;
    }

    .answer-button:hover {
      background-color: #f3f4f6;
    }

.highlighted-word {
  background-color: blue;
  color: white;
}

  `;

  constructor() {
    super();
    this._word = '';
    this._answers = '';
    this._showPopup = false;
    this._state = '';
    this.popupPosition = 'top';
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
  }

  firstUpdated() {
    const parent = this.closest('.story-content')?.children[0];
    if (parent) {
      const componentRect = this.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const oneThirdHeight = parentRect.height / 3;
      const topThirdBoundary = parentRect.top + oneThirdHeight;
      const bottomThirdBoundary = parentRect.top + 2 * oneThirdHeight;

      if (componentRect.top < topThirdBoundary) {
        this.popupPosition = 'top';
      } else if (componentRect.top >= topThirdBoundary && componentRect.top < bottomThirdBoundary) {
        this.popupPosition = 'middle';
      } else {
        this.popupPosition = 'bottom';
      }
    }
  }

  get word() {
    return this._word;
  }

  set word(value) {
    const oldValue = this._word;
    this._word = value;
    this.requestUpdate('word', oldValue);
  }

  get answers() {
    return this._answers;
  }

  set answers(value) {
    const oldValue = this._answers;
    this._answers = value;
    this.requestUpdate('answers', oldValue);
  }

  get showPopup() {
    return this._showPopup;
  }

  set showPopup(value) {
    const oldValue = this._showPopup;
    this._showPopup = value;
    this.requestUpdate('showPopup', oldValue);
  }

  get state(): string {
    return this._state;
  }

  set state(value: string) {
    const oldValue = this._state;
    this._state = value;
    this.requestUpdate('state', oldValue);
  }

  get answersList(): string[] {
    return this.answers.split(',').map((answer: string) => answer.trim()).filter((answer: string) => answer);
  }

  handleWordClick() {
    this.showPopup = !this.showPopup;
  }

  handleAnswerClick(answer: string) {
    // Dispatch custom event with the selected answer
    this.dispatchEvent(new CustomEvent('answer-selected', {
      detail: { word: this.word, answer },
      bubbles: true,
      composed: true
    }));
    this.showPopup = false;
  }

  handleOutsideClick(event: Event) {
    // Check if the click is outside this component
    if (!event.composedPath().includes(this)) {
      this.showPopup = false;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Add event listener when component is connected to DOM
    document.addEventListener('click', this.handleOutsideClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Remove event listener when component is disconnected from DOM
    document.removeEventListener('click', this.handleOutsideClick);
  }

  render() {
    const classes = ['question-word'];
    if (this.state === 'correct') {
      classes.push('correct');
    } else if (this.state === 'incorrect') {
      classes.push('incorrect');
    }

    return html`
      <span class="${classes.join(' ')}" @click=${this.handleWordClick}>
        <slot></slot>
      </span>
      ${this.showPopup && ['middle', 'bottom'].includes(this.popupPosition) ? html`
        <div class="popup top">
          <div class="answers">
            ${(this.popupPosition === 'middle' ? this.answersList.slice(0, Math.floor(this.answersList.length / 2)): this.answersList).map((answer: string) => html`
              <button 
                class="answer-button"
                @click=${() => this.handleAnswerClick(answer)}
              >
                ${answer}
              </button>
            `)}
          </div>
        </div>
      ` : ''}
      ${this.showPopup && ['top', 'middle'].includes(this.popupPosition) ? html`
        <div class="popup bottom">
          <div class="answers">
            ${(this.popupPosition === 'middle' ? this.answersList.slice(Math.ceil(this.answersList.length / 2), this.answersList.length): this.answersList).map((answer: string) => html`
              <button 
                class="answer-button"
                @click=${() => this.handleAnswerClick(answer)}
              >
                ${answer}
              </button>
            `)}
          </div>
        </div>
      ` : ''}
    `;
  }
}

customElements.define('question-element', QuestionComponent);

declare global {
  interface HTMLElementTagNameMap {
    'question-element': QuestionComponent;
  }
}