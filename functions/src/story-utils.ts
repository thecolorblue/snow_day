import { openai } from './openai';
import { geminiModel } from './gemini';
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
  question: z.string()
});

const OAIAnswersResponse = z.object({
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

export async function createComprehensionQuestion(instructions: string, paragraph: string): Promise<Question> {
  const maxRetries = 3;

  // Generate question
  const question = await retryApiCall(async () => {
    const questionPrompt = `${instructions}\n\nText: \n${paragraph}\n\n`;
    
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: questionPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const response = result.response;
    const text = response.text();

    return text;

  }, maxRetries);

  // Generate answers
  const answers = await retryApiCall(async () => {
    const answersPrompt = `Generate 3-4 possible answers for this comprehension question based on the given text. The first answer should be the correct one, followed by one answer that is close, and 1-2 answers that are obviously not true. Answers should be seperated by a comma.

Question: ${question}
Paragraph: ${paragraph}`;

    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: answersPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 5000,
      },
    });

    const response = result.response;
    const text = response.text();
    const answers = text.split(',');
    
    if (!answers) {
      throw new Error(`response formating incorrect ${text}`)
    }

    if (answers.length > 2) {
      return answers.slice(0,3).join(',');
    } else {
      throw new Error(`not enough answers: ${text}`)
    }
  }, maxRetries);

  if (!answers || answers.split(',').length < 2) {
    throw new Error(`unable to generate comprehension question. ${question}: ${JSON.stringify(answers)}`)
  }

  return {
    type: 'comprehension',
    question,
    correct: answers.split(',')[0],
    answers: answers
  };
}

async function retryApiCall<T>(apiCall: () => Promise<T>, maxRetries: number): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = new Error(`Attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
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
          format: zodTextFormat(OAIAnswersResponse, "event"),
        },
      });

      const content = response.output_parsed;
      
      try {
        // Verify that we got an array of strings
        if (content && Array.isArray(content.answers) && content.answers.every((item: any) => typeof item === 'string')) {
          const allAnswers = [word, ...content.answers];
          allAnswers.sort(() => Math.random() - 0.5); // Shuffle the answers

          console.log(`Q: ${word}, answers: ${allAnswers.join(',')}`);

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

