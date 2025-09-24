
import prisma from './prisma';
import { openai } from './openai';
import { validateAndRewriteParagraph, generateAndUploadAudio, generateQuestion, Question, FASegment, FAWord } from './story-utils';
import { Storyline } from '@prisma/client';

export interface ParsedStoryline extends Storyline {
  words: string[];
  genre: string[];
  location: string[];
  style: string[];
  selected_interests: string[];
  friend: string[];
  vocab_id: number;
  student_id: number;
}

const chapterMap = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
export const storyCircleChapters = [
  "Introduce the protagonist in their ordinary world. Establish their life, personality, and setting.",
  "Show what's missing in their life. This should set the stakes for the rest of the story. They desire something or are faced with a challenge that disrupts their normalcy. A magical creature or item is revealed but it is not clear to what use.",
  "The protagonist is forced to make a choice to leave their comfort zone, embarking on their journey. ",
  "They find obstacles in this new world. They fail their first challenge and must un-learn something foundational to their ordinary world to continue on their journey.",
  "They achieve what they sought and receive an item of great value (at least to them) and new knowledge that brings clarity to their ordinary world, but it comes with unexpected consequences.",
  "A major cost or sacrifice is required. The protagonist pays a price, forcing growth or change to move forward in their journey.",
  "They head back to their familiar world, with both tangible and intangible items. The journey has revealed a fundamental truth about their world that was not clear before. This new perspective makes the solution to previous problems trivial and they receive great praise for the value they can add to their community.",
  "The protagonist integrates what they've learned, resolving the journey with newfound wisdom or transformation.",
];
const instructions = `
You are an expert fiction writer for elementary students. You will write one chapter at a time. Each chapter should be about 150 words. 
Write stories in eight chapters, each corresponding to a step in the Dan Harmon Story Circle.

Your output is always in markdown format.`;

export interface ProcessedParagraph {
  content: string;
  audio?: string;
  map?: FAWord[];
  questions: Question[];
}

export class StoryGenerator {
  async fetchStoryline(storylineId: number): Promise<ParsedStoryline> {
    const storyline = await prisma.storyline.findUnique({
      where: { storyline_id: storylineId },
    });

    if (!storyline) {
      throw new Error(`Storyline with ID ${storylineId} not found.`);
    }

    if (storyline.status !== 'pending') {
      throw new Error(`Storyline ${storylineId} has already been processed.`);
    }

    // Parse the original_request to extract our specific fields
    const requestData = JSON.parse(storyline.original_request as string) as {
      words: string[];
      genre: string;
      location: string;
      style: string;
      selected_interests: string[];
      friend: string;
      vocab_id?: number;
    };

    return {
      ...storyline,
      words: requestData.words,
      student_id: requestData.student_id || 0,
      vocab_id: requestData.vocab_id || 0,
      genre: [requestData.genre],
      location: [requestData.location],
      style: [requestData.style],
      selected_interests: requestData.selected_interests,
      friend: [requestData.friend]
    };
  }

  async generateContent(storylineData: ParsedStoryline): Promise<string[]> {
    const { words, genre, location, style, selected_interests, friend, vocab_id } = storylineData;
    const interests_string = selected_interests?.join(', ') || 'nothing in particular';
    const user_name = "Maeve"; // Assuming static user for now
    const user_age = 8; // Assuming static age for now

    const user_prompt = `
      Write an ${genre} story located in ${location} in the style of ${style} for ${user_name} who is ${user_age} years old. It should be very silly. Over the top silly.
      She likes ${interests_string}, and her best friend is ${friend}.
      The story must include the following words: ${words.join(', ')}.
      Make the story about 4 paragraphs long.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: user_prompt }],
      temperature: 1,
    });

    const content = response.choices[0].message?.content;
    if (!content) {
      throw new Error('LLM response was empty.');
    }

    return content.split('\n\n').filter((p: string) => p.trim());
  }

  async chapterGenerator(storylineData: ParsedStoryline, previousChapter: string|undefined = undefined, index: number = 0): Promise<string | null> {
    if (!storyCircleChapters[index]) {
      return Promise.resolve(null);
    }
    const { genre, location, style, selected_interests, vocab_id, student_id } = storylineData;
    const interests_string = selected_interests?.join(', ') || 'nothing in particular';
    const words = async this.pickNextWords(vocab_id, student_id);
    const user_prompt = `
Write the ${chapterMap[index]} chapter that should ${storyCircleChapters[index]}

Story Description:
Write an ${genre} story located in ${location} in the style of ${style}. It should be very silly. Over the top silly.
The story must include the following words: ${words.join(', ')}.

Previous Chapter:
${previousChapter}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: user_prompt }
      ],
      temperature: 1,
    });

    const content = response.choices[0].message?.content;
    if (!content) {
      throw new Error('LLM response was empty.');
    }

    return content

  }

  async processParagraph(paragraph: string, storylineData: ParsedStoryline, index: number = 0): Promise<ProcessedParagraph> {
    const validatedParagraph = await validateAndRewriteParagraph(paragraph, storylineData.words);

    if (!validatedParagraph) {
      throw new Error('Failed to validate and rewrite paragraph.');
    }

    const { audio, map } = await generateAndUploadAudio(validatedParagraph, storylineData.storyline_id, index);

    const wordsInParagraph = storylineData.words.filter((word: string) => validatedParagraph.toLowerCase().includes(word.toLowerCase()));
    const qPromises = [];
    for (const word of wordsInParagraph) {
      qPromises.push(generateQuestion(word));
    }

    const questions = await Promise.all(qPromises);

    return {
      content: validatedParagraph,
      audio,
      map,
      questions
    };
  }

  async pickNextWords(vocab_id: number, student_id:number): Promise<string[]> {
    const [vocab, progress] = Promise.all([
        prisma.vocab.findFirst({
        where: {
          id: vocab_id
        }
      }),
      prisma.storylineProgress.findMany({
        where: {
          student_id: student_id
        }
      })
    ]);

    // match progress to vocab words
    // - Words with no storyline_progress first
    // - Then words with highest attempts (at least 2 attempts)
    // - Then words with longest duration

    //
  }

  async save(storylineData: ParsedStoryline, paragraphs: ProcessedParagraph[], index?: number) {
    const requestData = JSON.parse(storylineData.original_request as string) as {
      vocab_id?: number;
    };

    await prisma.$transaction(async (tx) => {
      const createdStories = await Promise.all(paragraphs.map(paraData =>
        tx.story.create({
          data: {
            content: paraData.content,
            audio: paraData.audio,
            map: JSON.stringify(paraData.map),
          },
        })
      ));

      const storylineStepsData = createdStories.map((story, paragraphIndex) => ({
        storyline_id: storylineData.storyline_id,
        step: index ? index + 1: paragraphIndex + 1,
        story_id: story.id,
      }));

      await tx.storylineStep.createMany({
        data: storylineStepsData,
      });

      const questionsToCreate: any[] = [];
      const storyIdForQuestion: number[] = [];

      paragraphs.forEach((paraData, index) => {
        const storyId = createdStories[index].id;
        paraData.questions.forEach(q => {
          questionsToCreate.push({
            data: {
              ...q,
              key: `vocab_${requestData.vocab_id}_${q.correct}`,
              classroom: `vocab_${requestData.vocab_id}`,
            },
          });
          storyIdForQuestion.push(storyId);
        });
      });

      if (questionsToCreate.length > 0) {
        const createdQuestions = await Promise.all(
          questionsToCreate.map(qData => tx.question.create(qData))
        );

        const storyQuestionLinks = createdQuestions.map((question, index) => ({
          story_id: storyIdForQuestion[index],
          question_id: question.id,
        }));

        await tx.storyQuestion.createMany({
          data: storyQuestionLinks,
        });
      }

      await tx.storyline.update({
        where: { storyline_id: storylineData.storyline_id },
        data: { status: 'completed' },
      });
    }, {
      maxWait: 10000, // default 2000
      timeout: 15000, // default 5000
    });
  }
}