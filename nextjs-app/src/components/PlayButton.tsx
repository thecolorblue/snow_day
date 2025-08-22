'use client';

import React, { useEffect, useRef } from 'react';

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