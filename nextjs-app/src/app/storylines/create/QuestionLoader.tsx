import prisma from '@/lib/prisma';
import { Student } from '@prisma/client'; // Import Student type
import StorylineForm from './StorylineForm'; // Import the form component
import { VocabWithStudent } from './StorylineForm';

// Define props including the static lists and searchParams
interface QuestionLoaderProps {
  searchParams?: { [key: string]: string | string[] | undefined };
  genres: string[];
  locations: string[];
  styles: string[];
  interests: string[];
  friends: string[];
}

// Fetch vocabs for all students (in a real app, you'd filter by current user's students)
async function getVocabs(): Promise<VocabWithStudent[]> {
  console.log("Fetching vocabs for students...");
  try {
    // Try to access the vocab model - if it fails, we'll catch the error
    const vocabs = await (prisma as any).vocab.findMany({
      include: {
        student_vocab: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log(`Found ${vocabs.length} vocabs.`);
    return vocabs;
  } catch (error) {
    console.error("Error fetching vocabs:", error);
    console.log("Vocab model may not be available yet in Prisma client, returning empty array");
    return []; // Return empty on error
  }
}

// Fetch all students
async function getStudents(): Promise<Student[]> {
  console.log("Fetching all students...");
  try {
    const students = await prisma.student.findMany({
      orderBy: {
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

// Async Server Component to load vocabs and render the form
export default async function QuestionLoader({
  searchParams,
  genres,
  locations,
  styles,
  interests: staticInterests, // Rename to avoid conflict
  friends: staticFriends,     // Rename to avoid conflict
}: QuestionLoaderProps) {
  // Fetch vocabs and students in parallel
  const [vocabs, students] = await Promise.all([
    getVocabs(),
    getStudents(),
  ]);

  // Render the form, passing the fetched vocabs and static lists
  return (
    <StorylineForm
      vocabs={vocabs}
      students={students} // Pass students to the form
      genres={genres}
      locations={locations}
      styles={styles}
      interests={staticInterests} // Pass static lists
      friends={staticFriends}     // Pass static lists
    />
  );
}