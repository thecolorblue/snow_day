
import prisma from './prisma';
import { openai } from './openai';
import { validateAndRewriteParagraph, generateAndUploadAudio, generateQuestion, Question, FASegment, FAWord, createComprehensionQuestion } from './story-utils';
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
  framework?: string;
}

const chapterMap = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];

export const frameworks:{ [name: string]: string[] } = {
  'story_circle': [
    "Introduce the protagonist in their ordinary world. Establish their life, personality, and setting through the character's actions.",
    "Show what's missing in their life. This should set the stakes for the rest of the story. They desire something or are faced with a challenge that disrupts their normalcy. A magical creature or item is revealed but it is not clear to what use.",
    "The protagonist is forced to make a choice to leave their comfort zone, embarking on their journey. ",
    "They find obstacles in this new world. They fail their first challenge and must un-learn something foundational to their ordinary world to continue on their journey.",
    "They achieve what they sought and receive an item of great value (at least to them) and new knowledge that brings clarity to their ordinary world, but it comes with unexpected consequences.",
    "A major cost or sacrifice is required. The protagonist pays a price, forcing growth or change to move forward in their journey.",
    "They head back to their familiar world, with both tangible and intangible items. The journey has revealed a fundamental truth about their world that was not clear before. This new perspective makes the solution to previous problems trivial and they receive great praise for the value they can add to their community.",
    "The protagonist integrates what they've learned, resolving the journey with newfound wisdom or transformation.",
  ],
  'heros_journey': [
    'Introduce the hero in their ordinary world. Show what their daily life looks like, what they care about, and what might be missing. Then, describe the moment when they receive the call to adventure — an invitation, challenge, or disruption that asks them to leave their comfort zone.',
    'Describe how the hero hesitates or refuses the call at first, then meets a mentor, guide, or helper who gives them courage or tools. Show the moment when the hero finally crosses into the unknown world, leaving their ordinary life behind.',
    'Create scenes where the hero faces tests, makes friends, and encounters enemies in the unfamiliar world. Show how each challenge teaches them something new and begins to transform them.',
    "Write the hero's greatest challenge yet — a life-or-death ordeal, major confrontation, or deep personal struggle. Show how they face their fear, what they learn, and the reward they earn (knowledge, treasure, reconciliation, or self-discovery).",
    "Describe the hero's journey back to the ordinary world. Show how they are changed by what they experienced and how they bring something valuable — wisdom, strength, or a gift — that transforms their community or world.",
  ],
  'three_acts': [
    "Introduce the main characters, the setting, and the world of the play. Establish their ordinary lives and relationships. Present the central conflict or problem that disrupts the status quo and forces the characters into action.",
    "Write scenes where the conflict escalates. Show the characters facing obstacles, setbacks, and rising stakes. Include moments of tension, transformation, or betrayal that push the story toward a crisis.",
    "Write the climax of the story, where the central conflict comes to a head. Resolve the main tension through decisive action. Then, show the aftermath: how the characters and their world are changed by the events of the play."
  ]
};
export const storyCircleChapters = [
  "Introduce the protagonist in their ordinary world. Establish their life, personality, and setting through the character's actions.",
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
Do not repeat details from the story that have already been stated. Prefer showing details through the character's actions rather than telling the reader. 
Your output is always in markdown format.`;
const comprehensionInstructions = `
Write a comprehension question for the given text. Keep the question short and at the same reading level as the text. 
`;


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
      student_id?: number;
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
    const chapters = frameworks[storylineData.framework || 'three_acts'];
    if (!chapters[index]) {
      return Promise.resolve(null);
    }
    const { genre, location, style, selected_interests, vocab_id, student_id } = storylineData;
    const interests_string = selected_interests?.join(', ') || 'nothing in particular';
    storylineData.words = await this.pickNextWords(vocab_id, student_id);

    const user_prompt = `
Write the ${chapterMap[index]} chapter that should ${chapters[index]}

Story Description:
Write an ${genre} story located in ${location} in the style of ${style} about ${interests_string}. It should be very silly. Over the top silly.
The story must include the following words: ${storylineData.words.join(', ')}.

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

    return content;
  }

  async processParagraph(paragraph: string, storylineData: ParsedStoryline, index: number = 0): Promise<ProcessedParagraph> {
    const validatedParagraph = await validateAndRewriteParagraph(paragraph, storylineData.words);

    if (!validatedParagraph) {
      throw new Error('Failed to validate and rewrite paragraph.');
    }

    const wordsInParagraph = storylineData.words.filter((word: string) => validatedParagraph.toLowerCase().includes(word.toLowerCase()));
    const qPromises = [];
    for (const word of wordsInParagraph) {
      qPromises.push(generateQuestion(word));
    }

    const [
      comprehensionQuestion,
      { audio, map },
      ...questions
    ] = await Promise.all([
      createComprehensionQuestion(comprehensionInstructions, validatedParagraph),
      generateAndUploadAudio(validatedParagraph, storylineData.storyline_id, index),
      ...qPromises
    ]);

    return {
      content: validatedParagraph,
      audio,
      map,
      questions: [ ...questions, comprehensionQuestion]
    };
  }

  async pickNextWords(vocab_id: number, student_id: number, count: number = 5): Promise<string[]> {
    const [vocab, progress] = await Promise.all([
      prisma.vocab.findFirst({
        where: {
          id: vocab_id,
        },
      }),
      prisma.storylineProgress.findMany({
        where: {
          student_id: student_id,
        },
        include: {
          story_question: {
            include: {
              question: true,
            },
          },
        },
      }),
    ]);

    if (!vocab) {
      return [];
    }

    const uniqueWords = [...new Set(vocab.list.split(',').map(w => w.toLocaleLowerCase().trim()))];
    const progressMap = new Map<string, { attempts: number; duration: number }>();

    for (const p of progress) {
      const word = p.story_question.question.correct;
      const existing = progressMap.get(word) || { attempts: 0, duration: 0 };
      existing.attempts += p.attempts || 1;
      existing.duration += p.duration || 0;
      progressMap.set(word, existing);
    }

    uniqueWords.sort((a, b) => {
      const aProgress = progressMap.get(a);
      const bProgress = progressMap.get(b);

      if (!aProgress && bProgress) return -1;
      if (aProgress && !bProgress) return 1;
      if (!aProgress && !bProgress) return 0;

      if (aProgress && bProgress) {
        if (aProgress.attempts >= 2 && bProgress.attempts < 2) return -1;
        if (aProgress.attempts < 2 && bProgress.attempts >= 2) return 1;
        if (aProgress.attempts >= 2 && bProgress.attempts >= 2) {
          if (aProgress.attempts !== bProgress.attempts) {
            return bProgress.attempts - aProgress.attempts;
          }
        }

        return bProgress.duration - aProgress.duration;
      }
      return 0;
    });

    return uniqueWords.slice(0, 5);
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