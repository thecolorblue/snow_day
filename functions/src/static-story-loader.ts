import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { StoryGenerator, ProcessedParagraph, ParsedStoryline } from './story-generator';
import prisma from './prisma';

// Note: This script requires 'js-yaml' and 'ts-node'.
// Install them with: npm install js-yaml @types/js-yaml --save-dev

interface StoryYaml {
  storyline: {
    student_id: number;
    vocab_id: number;
    original_request: {
      words: string[];
      genre: string;
      location: string;
      style: string;
      selected_interests: string[];
      friend: string;
    };
  };
  story: Array<{
    paragraph: string;
    words: Array<string>;
    comprehension?: boolean;
  }>;
}

async function loadStoryFromYaml(filePath: string) {
  const storyGenerator = new StoryGenerator();
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(fileContents) as StoryYaml;

  // Add student_id and vocab_id to the original_request object before saving.
  const originalRequestWithIds = {
    ...data.storyline.original_request,
    student_id: data.storyline.student_id,
    vocab_id: data.storyline.vocab_id,
  };

  // 1. Create a new storyline record in the database.
  const newStoryline = await prisma.storyline.create({
    data: {
      original_request: JSON.stringify(originalRequestWithIds),
      status: 'pending', // The 'save' method will update this to 'completed'.
    },
  });

  console.log(`Created storyline with ID: ${newStoryline.storyline_id}`);

  // 2. Construct the ParsedStoryline object needed for processing.
  const storylineData: ParsedStoryline = {
    ...newStoryline,
    words: data.storyline.original_request.words,
    genre: [data.storyline.original_request.genre],
    location: [data.storyline.original_request.location],
    style: [data.storyline.original_request.style],
    selected_interests: data.storyline.original_request.selected_interests,
    friend: [data.storyline.original_request.friend],
    student_id: data.storyline.student_id,
    vocab_id: data.storyline.vocab_id,
    original_request: newStoryline.original_request as string,
  };

  try {
    // 3. Process each paragraph from the YAML file.
    const processedParagraphsPromises = data.story.map((item, index) => {
      console.log(`Processing paragraph ${index + 1}...`);
      // The words for the paragraph are taken from the main storyline data.
      storylineData.words = item.words || [];
      return storyGenerator.processParagraph(item.paragraph, storylineData, index, item.comprehension || false);
    });

    const processedParagraphs = await Promise.all(processedParagraphsPromises);
    console.log('All paragraphs processed successfully.');

    // 4. Save the processed paragraphs and associated data to the database.
    console.log('Saving story to the database...');
    await storyGenerator.save(storylineData, processedParagraphs);
    console.log(`Storyline ${newStoryline.storyline_id} and its content have been saved.`);

  } catch (error) {
    console.error('An error occurred during paragraph processing or saving:', error);
    // If an error occurs, update the storyline status to 'failed' for tracking.
    await prisma.storyline.update({
        where: { storyline_id: newStoryline.storyline_id },
        data: { status: 'failed' },
    });
  }
}

// This allows the script to be run from the command line.
// Usage: ts-node functions/src/static-story-loader.ts <path_to_yaml_file>
const filePath = process.argv[2];
if (!filePath) {
  console.error('Please provide the path to a YAML story file.');
  process.exit(1);
}

loadStoryFromYaml(filePath)
  .catch(e => {
    console.error('The script encountered a fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });