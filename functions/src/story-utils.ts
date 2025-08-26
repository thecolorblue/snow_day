import { openai } from './openai';
import { Storage } from '@google-cloud/storage';
import { AlignmentResult, align } from 'echogarden';
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ProcessedParagraph } from './story-generator';


const storage = new Storage();

export interface FASegment {
  type: 'segment';
  text: string;
  startTime: number;
  endTime: number;
  timeline: FASentence[];
}

export interface FASentence {
  type: 'sentence';
  text: string;
  startTime: number;
  endTime: number;
  timeline: FAWord[];
}

export interface FAWord {
  type: 'word';
  text: string;
  startTime: number;
  endTime: number;
  startOffsetUtf32: number;
  endOffsetUtf32: number;
}

export async function validateAndRewriteParagraph(
  paragraph: string,
  requiredWords: string[],
  maxTries = 3,
  maxMissingWords = 0
): Promise<string | null> {
  // Check if we've exceeded maximum tries
  if (maxTries <= 0) {
    return null;
  }

  // Check for required words
  const missingWords = requiredWords.filter(word => !paragraph.toLowerCase().includes(word.toLowerCase()));
  
  // If we have enough words or no words are required, return the paragraph
  if (missingWords.length === 0 || maxMissingWords >= requiredWords.length) {
    return paragraph;
  }
  
  // If we have fewer missing words than the minimum required, return it
  if (missingWords.length >= requiredWords.length - maxMissingWords) {
    return paragraph;
  }

  const rewritePrompt = `
    Rewrite the following paragraph to include the words: ${missingWords.join(', ')}.
    Keep the meaning and tone of the original paragraph as much as possible.

    Original paragraph:
    "${paragraph}"

    Rewritten paragraph:
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: rewritePrompt }],
      temperature: 1,
    });

    const rewrittenParagraph = response.choices[0].message?.content?.trim();
    if (!rewrittenParagraph) {
      return null;
    }

    // Final check to ensure the words are now present
    const finalMissingWords = missingWords.filter(word => !rewrittenParagraph.toLowerCase().includes(word.toLowerCase()));
    if (finalMissingWords.length > 0) {
      // If words are still missing, try recursively with one less try
      return validateAndRewriteParagraph(rewrittenParagraph, requiredWords, maxTries - 1, maxMissingWords);
    }

    return rewrittenParagraph;
  } catch (error) {
    console.error('Error calling LLM for rewrite:', error);
    return null;
  }
}



const OAIQuestionResponse = z.object({
  answers: z.array(z.string())
});

const convertAlignmentToWords = function(alignment: AlignmentResult): FAWord[] {
  const words: FAWord[] = [];

  const findWords = (timeline: any[]) => {
    for (const item of timeline) {
      if (item.type === 'word') {
        words.push({
          type: item.type,
          text: item.text,
          startTime: item.startTime,
          endTime: item.endTime,
          startOffsetUtf32: item.startOffsetUtf32,
          endOffsetUtf32: item.endOffsetUtf32
        });
      } else if (item.timeline) {
        findWords(item.timeline);
      }
    }
  };

  findWords(alignment.timeline);
  return words;
}

export async function generateAndUploadAudio(text: string, storylineId: number, paragraphIndex: number): Promise<Partial<ProcessedParagraph>> {
  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      "voice" : "sage",
      input: text,
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const blobName = `snow_day/audio/story_${storylineId}_para_${paragraphIndex}.mp3`;
    const alignment = await align(audioBuffer, text, {});
    
    const bucketName = process.env.GCP_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('GCP_BUCKET_NAME environment variable not set.');
    }
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(blobName);

    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/mpeg',
      },
      public: true,
    });

    const url = `https://storage.googleapis.com/${bucketName}/${blobName}`;

    return {
      audio: url,
      map: convertAlignmentToWords(alignment)
    };
  } catch (error) {
    throw new Error('Error generating or uploading audio:' + error);
  }
}
  
export interface Question {
  type: string;
  question: string;
  correct: string;
  answers: string;
}

export async function generateQuestion(word: string): Promise<Question> {
  try {
    const prompt = `Generate 3 incorrect spellings of the word "${word}".`;
    
    // Try up to 3 times to get a valid response
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await openai.responses.parse({
        model: "gpt-5-mini-2025-08-07",
        input: [{
            role: "user",
            content: prompt,
          },
        ],
        text: {
          format: zodTextFormat(OAIQuestionResponse, "event"),
        },
      });

      const content = response.output_parsed;
      
      try {
        // Verify that we got an array of strings
        if (content && Array.isArray(content.answers) && content.answers.every(item => typeof item === 'string')) {
          const allAnswers = [word, ...content.answers];
          allAnswers.sort(() => Math.random() - 0.5); // Shuffle the answers

          return {
            type: 'select',
            question: 'Pick the correct spelling.',
            correct: word,
            answers: allAnswers.join(','),
          };
        } else {
          // If parsing succeeded but format is wrong, continue to next attempt
          console.warn(`Attempt ${attempt + 1}: Response format not as expected for word "${word}"`);
        }
      } catch (parseError) {
        // If parsing fails, continue to next attempt
        console.warn(`Attempt ${attempt + 1}: Failed to parse response for word "${word}":`, parseError);
      }
    }
    
    throw new Error(`Failed to generate valid question for word "${word}" after 3 attempts`);
  } catch (error) {
    throw new Error(`Error generating question for word "${word}":` + error);
  }
}

/**
 * Fetches audio data from a URL and returns it as a Buffer
 * @param url - The URL of the audio file
 * @returns Promise resolving to a Buffer containing the audio data
 */
export async function fetchAudioFromUrl(url: string): Promise<Uint8Array> {
  // Check if the URL is a valid HTTP/HTTPS URL
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL provided: ${url}`);
  }

  // Use the global fetch API (available in Node.js 18+)
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch audio from URL ${url}: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

