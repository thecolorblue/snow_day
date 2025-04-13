import Link from 'next/link';
// Remove prisma and Question imports as they are handled in QuestionLoader
import QuestionLoader from './QuestionLoader'; // Import the new loader component

export const dynamic = 'force-dynamic'; // Explicitly mark page as dynamic
// Define static options (matching the template)
const GENRES = ['adventure', 'super hero', 'mystery', 'comedy', 'science fiction'];
const LOCATIONS = ['under water', 'wild west', 'jungles of Africa', 'Antartica', 'Japanese Mountains'];
const STYLES = ['poem', 'comic book', 'Shakespeare', 'Harry Potter'];
const INTERESTS = ['basketball', 'acting', 'directing plays', 'American Girl dolls', 'skateboarding', 'ice skating', 'Mario Kart', 'Zelda'];
const FRIENDS = ['Paige', 'Maia', 'Zadie', 'Zoe'];

// Remove the getQuestions function as it's moved to QuestionLoader

// The Page component (Server Component)
export default async function CreateStorylinePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Data fetching is now handled by QuestionLoader

  return (
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
        searchParams={searchParams}
        genres={GENRES}
        locations={LOCATIONS}
        styles={STYLES}
        interests={INTERESTS}
        friends={FRIENDS}
      />
    </div>
  );
}