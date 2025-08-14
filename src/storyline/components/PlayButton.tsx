'use client';

import React, { useEffect, useRef } from 'react';

// Define the props for the PlayStory component
interface PlayStoryProps {
  forElementId: string;
}

// A client-side component to wrap the 'play-story' custom element
export const PlayStory: React.FC<PlayStoryProps> = ({ forElementId }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Dynamically define the custom element if it's not already defined
    if (!customElements.get('play-story')) {
      customElements.define(
        'play-story',
        class extends HTMLElement {
          private button: HTMLButtonElement | null = null;
          private utterance: SpeechSynthesisUtterance | null = null;
          private isSpeaking = false;
          private forElementId: string | null = null;

          static get observedAttributes() {
            return ['for'];
          }

          constructor() {
            super();
            const template = document.createElement('template');
            template.innerHTML = `
              <style>
                md-filled-tonal-button {
                  margin-top: 1rem;
                }
              </style>
              <md-filled-tonal-button>Play/Pause Story</md-filled-tonal-button>
            `;
            const shadowRoot = this.attachShadow({ mode: 'open' });
            shadowRoot.appendChild(template.content.cloneNode(true));

            this.button = shadowRoot.querySelector('md-filled-tonal-button');
            if (this.button) {
              this.button.addEventListener('click', () => this.toggleSpeech());
            }
          }

          attributeChangedCallback(name: string, oldValue: string, newValue: string) {
            if (name === 'for') {
              this.forElementId = newValue;
            }
          }

          toggleSpeech() {
            if (!this.utterance) {
              window.speechSynthesis.cancel();
              const textToSpeak = document.getElementById(this.forElementId!)?.textContent || '';
              this.utterance = new SpeechSynthesisUtterance(textToSpeak);
              this.utterance.onend = () => {
                this.isSpeaking = false;
                if (this.button) this.button.innerText = 'Play/Pause Story';
              };
              this.utterance.onpause = () => {
                this.isSpeaking = false;
                if (this.button) this.button.innerText = 'Resume Story';
              };
            }

            if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
              window.speechSynthesis.pause();
            } else {
              window.speechSynthesis.resume();
              if (!window.speechSynthesis.speaking) {
                window.speechSynthesis.speak(this.utterance);
              }
              this.isSpeaking = true;
              if (this.button) this.button.innerText = 'Pause Story';
            }
          }
        },
      );
    }
  }, []);

  return React.createElement('play-story', { ref, for: forElementId });
};

// Define the props for the PlayWord component
interface PlayWordProps {
  children: React.ReactNode;
}

// A client-side component to wrap the 'play-word' custom element
export const PlayWord: React.FC<PlayWordProps> = ({ children }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Dynamically define the custom element if it's not already defined
    if (!customElements.get('play-word')) {
      customElements.define(
        'play-word',
        class extends HTMLElement {
          constructor() {
            super();
            const template = document.createElement('template');
            template.innerHTML = `
              <style>
                md-filled-tonal-icon-button {
                  margin-left: 8px;
                }
              </style>
              <md-filled-tonal-icon-button>
                <span class="material-symbols-outlined">volume_up</span>
              </md-filled-tonal-icon-button>
            `;
            const shadowRoot = this.attachShadow({ mode: 'open' });
            shadowRoot.appendChild(template.content.cloneNode(true));

            const speakButton = shadowRoot.querySelector('md-filled-tonal-icon-button');
            if (speakButton) {
              speakButton.addEventListener('click', () => this.speakText());
            }
          }

          speakText() {
            const textContent = Array.from(this.childNodes)
              .map(node => (node.nodeType === Node.TEXT_NODE ? node.textContent?.trim() : ''))
              .filter(text => text !== '')
              .join(' ');

            if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
              const utterance = new SpeechSynthesisUtterance(textContent);
              utterance.lang = 'en-US';
              utterance.pitch = 1;
              utterance.rate = 1;
              utterance.volume = 1;

              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(utterance);
            } else {
              console.warn('Speech synthesis not supported in this browser.');
            }
          }
        },
      );
    }
  }, []);

  return React.createElement('play-word', { ref }, children);
};