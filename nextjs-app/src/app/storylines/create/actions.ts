"use server"; // Mark this file as containing Server Actions

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';

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

// Helper function to select words from vocab based on storyline progress
async function selectWordsFromVocab(vocabId: number): Promise<string[]> {
  try {
    // Fetch the vocab
    const vocab = await (prisma as any).vocab.findUnique({
      where: { id: vocabId },
    });

    if (!vocab) {
      throw new Error(`Vocab with ID ${vocabId} not found`);
    }

    // Parse the comma-separated word list
    const allWords = vocab.list.split(',').map((word: string) => word.trim()).filter((word: string) => word.length > 0);
    
    if (allWords.length === 0) {
      throw new Error(`No words found in vocab ${vocabId}`);
    }

    // For now, return a sample of words (up to 5)
    // TODO: Implement storyline progress logic to select words based on:
    // - Words with no storyline_progress first
    // - Then words with highest attempts (at least 2 attempts)
    // - Then words with longest duration
    const maxWords = Math.min(5, allWords.length);
    return sampleSize(allWords, maxWords);

  } catch (error) {
    console.error("Error selecting words from vocab:", error);
    // Fallback to some default words if vocab fetch fails
    return ['cat', 'dog', 'house', 'tree', 'book'];
  }
}

export async function createStorylineAction(formData: FormData) {
  // 1. Extract data from FormData
  const selectedVocabId = formData.get('selected_vocab') as string;
  const selectedStudentId = formData.get('selected_student') as string;
  const genre = formData.get('genres') as string || null; // Handle empty selection
  const location = formData.get('locations') as string || null;
  const style = formData.get('styles') as string || null;
  const interests = formData.getAll('interests') as string[];
  const friends = formData.getAll('friends') as string[];

  // Validate student selection
  if (!selectedStudentId) {
    throw new Error("Please select a student.");
  }

  const studentId = parseInt(selectedStudentId, 10);
  if (isNaN(studentId)) {
    throw new Error("Invalid student selection.");
  }

  // Validate vocab selection
  if (!selectedVocabId) {
    throw new Error("Please select a vocabulary list.");
  }

  const vocabId = parseInt(selectedVocabId, 10);
  if (isNaN(vocabId)) {
    throw new Error("Invalid vocabulary selection.");
  }

  // 2. Select words from the chosen vocab based on storyline progress
  let selectedWords: string[] = [];
  try {
    selectedWords = await selectWordsFromVocab(vocabId);
    console.log(`Selected ${selectedWords.length} words from vocab ${vocabId}: ${selectedWords.join(', ')}`);
  } catch (error) {
    console.error("Error selecting words from vocab:", error);
    throw new Error("Failed to select words from vocabulary.");
  }

  // 3. Construct the storyline_data JSON object
  // Use selected values or random defaults if not selected
  const storylineData = {
    student_id: studentId,
    vocab_id: vocabId,
    words: selectedWords, // Array of words from the vocab
    genre: genre ?? GENRES[getRandomInt(0, GENRES.length - 1)],
    location: location ?? LOCATIONS[getRandomInt(0, LOCATIONS.length - 1)],
    style: style ?? STYLES[getRandomInt(0, STYLES.length - 1)],
    selected_interests: interests.length > 0 ? interests : sampleSize(INTERESTS, 2),
    friend: friends.length > 0 ? friends[getRandomInt(0, friends.length - 1)] : FRIENDS[getRandomInt(0, FRIENDS.length - 1)],
  };

  // 4. Create Storyline record in the database
  try {
    const storyline = await prisma.storyline.create({
      data: {
        original_request: JSON.stringify(storylineData), // Store the constructed data as JSON
        status: 'pending', // Set initial status
        // storyline_id is auto-generated
      },
    });

    // Make HTTP POST request to Google Cloud Function using google-cloud/functions package
    const postData = `storyline_id=${storyline.storyline_id}`;
    
    // Using fetch for making HTTP requests (Node.js 18+ has built-in fetch)
    try {
      const response = await fetch(`${process.env.FUNCTIONS_URL}/generateStory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData).toString()
        },
        body: postData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.text();
      console.log(`Successfully sent request to generate story. Response: ${result}`);
    } catch (error) {
      console.error('Error sending request to generate story:', error);
      throw new Error('Failed to send request to generate story');
    }
    
    console.log("Successfully created storyline with vocab-based data");
  } catch (error) {
    console.error("Error creating storyline:", error);
    // Consider returning an error message to the user
    throw new Error("Failed to create storyline in the database.");
  }

  // 5. Redirect to the storylines dashboard on success
  redirect('/storylines');
}