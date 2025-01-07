// play-story.js

const template = document.createElement('template');
template.innerHTML = `
  <style>
    /* Add any specific styles here if needed */
  </style>
  <md-filled-tonal-button class="button-play">
    Play
    <svg slot="icon" viewBox="0 0 48 48"><path d="M6 40V8l38 16Zm3-4.65L36.2 24 9 12.5v8.4L21.1 24 9 27Z"/></svg>
  </md-filled-tonal-button>
`;

class PlayStory extends HTMLElement {
  static get observedAttributes() {
    return ['for'];
  }

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));

    // Attach event listener for button click
    this.button = shadowRoot.querySelector('md-filled-tonal-button');
    this.button.addEventListener('click', () => {
      this.toggleSpeech();
    });

    this.isSpeaking = false;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'for') {
      this.forElementId = newValue;
    }
  }

  toggleSpeech() {
    if (!this.utterance) {
      const textToSpeak = document.getElementById(this.forElementId)?.innerText || '';
      this.utterance = new SpeechSynthesisUtterance(textToSpeak);
      this.utterance.onend = () => {
        this.isSpeaking = false;
        this.button.innerText = 'Play/Pause Story';
      };
      this.utterance.onpause = () => {
        this.isSpeaking = false;
        this.button.innerText = 'Resume Story';
      };
    }

    if (this.isSpeaking) {
      window.speechSynthesis.pause();
    } else {
      window.speechSynthesis.resume();
      if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.speak(this.utterance);
      }
      this.isSpeaking = true;
      this.button.innerText = 'Pause Story';
    }
  }
}

customElements.define('play-story', PlayStory);

// Import and use the component in your HTML file
export { PlayStory };