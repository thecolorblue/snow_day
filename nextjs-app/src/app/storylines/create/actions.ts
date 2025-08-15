"use server"; // Mark this file as containing Server Actions

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Question } from '@prisma/client';

// Define static options (matching the template/form component)
// Consider moving these to a shared constants file if used elsewhere
const GENRES = ['adventure', 'super hero', 'mystery', 'comedy', 'science fiction'];
const LOCATIONS = ['under water', 'wild west', 'jungles of Africa', 'Antarctica', 'Japanese Mountains'];
const STYLES = ['poem', 'comic book', 'Shakespeare', 'Harry Potter'];
const INTERESTS = ['basketball', 'acting', 'directing plays', 'American Girl dolls', 'skateboarding', 'ice skating', 'Mario Kart', 'Zelda'];
const FRIENDS = ['Paige', 'Maia', 'Zadie', 'Zoe'];

// Helper function to get a random integer between min (inclusive) and max (inclusive)
function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get n random unique elements from an array (Fisher-Yates shuffle)
function sampleSize<T>(arr: T[], n: number): T[] {
  if (n < 0 || n > arr.length) {
    throw new Error("Invalid sample size");
  }
  const shuffled = arr.slice(); // Create a copy
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; // Swap elements
  }
  return shuffled.slice(0, n);
}

// Type definition for the expected structure of serialized questions
type SerializedQuestion = {
    id: number;
    type: string;
    question: string;
    key: string;
    correct: string;
    answers: string[] | null; // Match orm.py structure
    classroom: string;
};

export async function createStorylineAction(formData: FormData) {
  // 1. Extract data from FormData
  const selectedQuestionIds = formData.getAll('selected_questions').map(id => parseInt(id as string, 10)).filter(id => !isNaN(id));
  const genre = formData.get('genres') as string || null; // Handle empty selection
  const location = formData.get('locations') as string || null;
  const style = formData.get('styles') as string || null;
  const interests = formData.getAll('interests') as string[];
  const friends = formData.getAll('friends') as string[];
  // const genTtl = formData.get('gen_ttl') === 'on'; // Example if checkbox was used

  let questionList: Question[] = [];
  let serializedQuestions: SerializedQuestion[] = [];

  // 2. Fetch selected Question objects from DB
  if (selectedQuestionIds.length > 0) {
    try {
      questionList = await prisma.question.findMany({
        where: {
          id: { in: selectedQuestionIds },
        },
      });

      // Serialize fetched questions for storing in original_request
      serializedQuestions = questionList.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question,
        key: q.key,
        correct: q.correct,
        answers: q.answers ? q.answers.split(',') : null, // Split answers string
        classroom: q.classroom,
      }));

      if (questionList.length !== selectedQuestionIds.length) {
        console.warn(`Could not find all selected questions. Found ${questionList.length} out of ${selectedQuestionIds.length} requested.`);
        // Handle discrepancy if needed (e.g., throw error or proceed)
      }
    } catch (error) {
      console.error("Error fetching selected questions:", error);
      // Consider returning an error message to the user
      throw new Error("Failed to fetch selected questions.");
    }
  } else {
    console.info("No questions selected for the new storyline.");
  }

  // 3. Construct the storyline_data JSON object (similar to FastAPI)
  // Use selected values or random defaults if not selected
  const storylineData = {
    question_list: serializedQuestions,
    genre: genre ?? GENRES[getRandomInt(0, GENRES.length - 1)],
    location: location ?? LOCATIONS[getRandomInt(0, LOCATIONS.length - 1)],
    style: style ?? STYLES[getRandomInt(0, STYLES.length - 1)],
    selected_interests: interests.length > 0 ? interests : sampleSize(INTERESTS, 2),
    friend: friends.length > 0 ? friends[getRandomInt(0, friends.length - 1)] : FRIENDS[getRandomInt(0, FRIENDS.length - 1)],
  };

  // 4. Create Storyline record in the database
  try {
    await prisma.storyline.create({
      data: {
        original_request: JSON.stringify(storylineData), // Store the constructed data as JSON
        status: 'pending', // Set initial status
        // storyline_id is auto-generated
      },
    });
  } catch (error) {
    console.error("Error creating storyline:", error);
    // Consider returning an error message to the user
    throw new Error("Failed to create storyline in the database.");
  }

  // 5. Redirect to the storylines dashboard on success
  redirect('/storylines');
}