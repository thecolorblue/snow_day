import prisma from '@/lib/prisma';
import { Question, Student } from '@prisma/client'; // Add Student type
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

// Fetch all students
async function getStudents(): Promise<Student[]> {
  console.log("Fetching all students...");
  try {
    const students = await prisma.student.findMany({
      orderBy: {
        // Optionally order by name or ID if you add a name field later
        createdAt: 'desc',
      },
    });
    console.log(`Found ${students.length} students.`);
    return students;
  } catch (error) {
    console.error("Error fetching students:", error);
    return []; // Return empty on error
  }
}

// Async Server Component to load questions and render the form
export default async function QuestionLoader({
  searchParams,
  genres,
  locations,
  styles,
  interests: staticInterests, // Rename to avoid conflict
  friends: staticFriends,     // Rename to avoid conflict
}: QuestionLoaderProps) {
  // Fetch questions and students in parallel
  const [questions, students] = await Promise.all([
    getQuestions(searchParams),
    getStudents()
  ]);

  // Render the form, passing the fetched questions and static lists
  return (
    <StorylineForm
      questions={questions}
      students={students} // Pass students to the form
      genres={genres}
      locations={locations}
      styles={styles}
      interests={staticInterests} // Pass static lists
      friends={staticFriends}     // Pass static lists
    />
  );
}