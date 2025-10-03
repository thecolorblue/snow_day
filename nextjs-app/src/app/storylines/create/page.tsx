import Link from 'next/link';
// Remove prisma and Question imports as they are handled in QuestionLoader
import QuestionLoader from './QuestionLoader'; // Import the new loader component
import AppHeader from '@/components/AppHeader';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Explicitly mark page as dynamic
// Define static options (matching the template)
const GENRES = ['adventure', 'super hero', 'mystery', 'comedy', 'science fiction'];
const LOCATIONS = ['under water', 'wild west', 'jungles of Africa', 'Antarctica', 'Japanese Mountains'];
const STYLES = ['poem', 'comic book', 'Shakespeare', 'Harry Potter'];
const INTERESTS = ['basketball', 'acting', 'directing plays', 'American Girl dolls', 'skateboarding', 'ice skating', 'Mario Kart', 'Zelda'];
const FRIENDS = ['Paige', 'Maia', 'Zadie', 'Zoe'];

// Remove the getQuestions function as it's moved to QuestionLoader

// Function to get the current logged-in user's Guardian record
async function getCurrentLoggedInUser() {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    return null;
  }

  try {
    const guardian = await prisma.guardian.findUnique({
      where: { email: session.user.email },
    });
    
    return guardian;
  } catch (error) {
    console.error('Error fetching Guardian:', error);
    return null;
  }
}

// The Page component (Server Component)
export default async function CreateStorylinePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Data fetching is now handled by QuestionLoader
  const searchParamsResults = await searchParams;

  const guardian = await getCurrentLoggedInUser();

  // If no guardian is found, show an error or redirect
  if (!guardian) {
    return (
      <>
        <AppHeader></AppHeader>
        <div className="container mx-auto p-4 max-w-2xl">
          <div className="text-center mb-6">
            <Link href="/storylines" className="text-blue-600 hover:underline">
              &larr; Back to Storylines
            </Link>
            <h1 className="text-3xl font-bold mt-2">Create New Storyline</h1>
          </div>
          <div className="text-center text-red-600">
            <p>You must be logged in to create a storyline.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
    <AppHeader></AppHeader>
    <div className="container mx-auto p-4 max-w-2xl">
       <div className="text-center mb-6">
         <Link href="/storylines" className="text-blue-600 hover:underline">
           &larr; Back to Storylines
         </Link>
         <h1 className="text-3xl font-bold mt-2">Create New Storyline</h1>
         {/* Removed conditional display of classroom name to avoid direct searchParams access here */}
       </div>

      {/* Render the QuestionLoader, passing searchParams and static lists */}
      <QuestionLoader
        searchParams={searchParamsResults}
        genres={GENRES}
        locations={LOCATIONS}
        styles={STYLES}
        interests={INTERESTS}
        friends={FRIENDS}
        guardian={guardian}
      />
    </div></>
  );
}