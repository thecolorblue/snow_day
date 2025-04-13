import prisma from '@/lib/prisma';
import { Question } from '@prisma/client';
import StorylineForm from './StorylineForm'; // Import the form component

// Define props including the static lists and searchParams
interface QuestionLoaderProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  genres: string[];
  locations: string[];
  styles: string[];
  interests: string[];
  friends: string[];
}

// Fetch questions based on classroom_name search parameter
async function getQuestions(searchParams?: { [key: string]: string | string[] | undefined }): Promise<Question[]> {
  // Directly use searchParams.classroom_name in the query logic
  const classroomNameParam = searchParams?.classroom_name;

  // Ensure classroomNameParam is a string and not empty before querying
  if (typeof classroomNameParam !== 'string' || !classroomNameParam) {
    console.log("No valid classroom name provided, returning empty questions list.");
    return [];
  }
  console.log(`Fetching questions for classroom: ${classroomNameParam}`);
  try {
    const questions = await prisma.question.findMany({
      where: {
        // Use the validated string parameter directly
        classroom: classroomNameParam,
      },
      orderBy: {
        id: 'asc', // Or order as needed
      },
    });
    console.log(`Found ${questions.length} questions.`);
    return questions;
  } catch (error) {
    console.error("Error fetching questions:", error);
    return []; // Return empty on error
  }
}

// Async Server Component to load questions and render the form
export default async function QuestionLoader({
  searchParams,
  genres,
  locations,
  styles,
  interests,
  friends,
}: QuestionLoaderProps) {
  // Fetch questions using the searchParams passed as props
  const questions = await getQuestions(searchParams);

  // Render the form, passing the fetched questions and static lists
  return (
    <StorylineForm
      questions={questions}
      genres={genres}
      locations={locations}
      styles={styles}
      interests={interests}
      friends={friends}
    />
  );
}