
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
}

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
      genre: [requestData.genre],
      location: [requestData.location],
      style: [requestData.style],
      selected_interests: requestData.selected_interests,
      friend: [requestData.friend]
    };
  }

  async generateContent(storylineData: ParsedStoryline): Promise<string[]> {
    const { words, genre, location, style, selected_interests, friend } = storylineData;
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

  async save(storylineData: ParsedStoryline, paragraphs: ProcessedParagraph[]) {
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

      const storylineStepsData = createdStories.map((story, index) => ({
        storyline_id: storylineData.storyline_id,
        step: index + 1,
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