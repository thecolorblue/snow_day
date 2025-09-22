import Link from 'next/link';
import prisma from '@/lib/prisma'; // Import the Prisma client instance
import { AppHeader } from '@/components';

// Define the expected shape of the data returned by the Prisma query (using snake_case from schema)
type StorylineQueryResult = {
  storyline_id: number;
  original_request: string | null;
  status: string;
  storyline_step: {
    story: {
      content: string;
      story_question: { // Include story questions
        question: { // Include the related question
          correct: string; // Select the question's ID
        };
      }[];
    };
    storyline_progress: { storyline_progress_id: number }[]; // Still need progress info
  }[];
};

// Define the shape of the data used by the component after mapping
type StorylineViewData = {
  storyline_id: number;
  original_request: string | null;
  status: string;
  step_count: number;
  progress: number;
  first_step_content_preview: string;
  unique_questions: Set<string>; // Add unique question count
};

// Fetch data directly in the Server Component
async function getStorylines() {
  // Fetch the storylines with selected fields and count of steps
  // Fetch the storylines using correct snake_case field names
  const storylines: StorylineQueryResult[] = await prisma.storyline.findMany({
    include: {
      storyline_step: { // Include all steps
        include: {
          story: {
            include: { // Change select to include to get nested relations
              story_question: { // Include the story questions
                include: {
                  question: { // Include the actual question
                    select: { correct: true } // Select the question's ID
                  }
                }
              }
            }
          },
          storyline_progress: { // Still need progress info for calculations
            select: { storyline_progress_id: true },
            take: 1,
          },
        },
        orderBy: { // Ensure steps are ordered correctly if needed elsewhere, though map accesses [0]
          storyline_step_id: 'asc',
        }
      },
    },
    orderBy: {
      storyline_id: 'desc', // Keep storylines ordered by ID desc
    },
  });

  // Transform the data slightly to match the expected structure (step_count)
  // Map the raw Prisma result to the structure needed by the component
  // Ensure we access the correct properties from the 'storylines' array elements
  // The input 'storyline' here has properties: storylineId, originalRequest, status, _count
  // Map the raw Prisma result to the structure needed by the component
  // Map the raw Prisma result using correct snake_case field names
  // Map the raw Prisma result, calculating step_count and progress
  return storylines.map((storyline: StorylineQueryResult): StorylineViewData => {
    const step_count = storyline.storyline_step.length;
    const progress = storyline.storyline_step.filter(step => step.storyline_progress.length > 0).length;
    const firstStepContent = storyline.storyline_step[0]?.story?.content ?? '';
    const preview = firstStepContent.split('\n')[0]; // Get first line
    const truncatedPreview = preview.length > 100 ? preview.substring(0, 97) + '...' : preview; // Truncate if long

    const uniqueQuestions = new Set<string>();
    storyline.storyline_step.forEach(step => {
      step.story?.story_question?.forEach(sq => {
        if (sq.question) {
          uniqueQuestions.add(sq.question.correct);
        }
      });
    });

    return {
      storyline_id: storyline.storyline_id,
      original_request: storyline.original_request,
      status: storyline.status,
      step_count: step_count,
      progress: progress,
      first_step_content_preview: truncatedPreview || 'No content',
      unique_questions: uniqueQuestions, // Add the count
    };
  });
}

// Helper function to truncate and format the request JSON
function formatRequest(requestJson: string | null): string {
  if (!requestJson) {
    return 'No request data';
  }
  try {
    const parsed = JSON.parse(requestJson);
    const truncatedJson = JSON.stringify(parsed, null, 2).substring(0, 100); // Truncate
    return truncatedJson + (JSON.stringify(parsed, null, 2).length > 100 ? '...' : '');
  } catch {
    // If parsing fails, return truncated raw string
    const truncatedRaw = requestJson.substring(0, 100);
    return truncatedRaw + (requestJson.length > 100 ? '...' : '');
  }
}

// Helper function to get status color class
function getStatusClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending': return 'text-yellow-600 font-bold';
    case 'completed': return 'text-green-600 font-bold';
    case 'failed': return 'text-red-600 font-bold';
    case 'in_progress': return 'text-blue-600 font-bold'; // Added for potential future use
    default: return 'text-gray-600 font-bold';
  }
}


export default async function StorylinesDashboard() {
  // Explicitly type the data received by the component
  const storylines: StorylineViewData[] = await getStorylines();

  return (
    <>
      <AppHeader></AppHeader>
      <div className="container mx-auto p-4">
        <div className="text-center mb-5">
          <h1 className="text-3xl font-bold mb-3">Storylines</h1>
          <Link href="/storylines/create">
            <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
              Create New Storyline
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storylines.filter(storyline => storyline.progress !== storyline.step_count).map((storyline) => (
            <div key={storyline.storyline_id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              {/* Title/Preview */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Storyline #{storyline.storyline_id}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{storyline.first_step_content_preview}</p>
              </div>

              {/* Status/Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Progress</span>
                  <span className="text-sm text-gray-500">{storyline.progress}/{storyline.step_count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(storyline.progress / storyline.step_count) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Questions */}
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-600 block mb-2">Questions</span>
                <div className="text-sm text-gray-700">
                  {storyline.unique_questions.size > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {[...storyline.unique_questions].map((question, index) => (
                        <span key={index} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {question}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">No questions</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                {storyline.step_count > 0 ? (
                  <Link href={`/storyline/${storyline.storyline_id}/mobile/1`}>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors">
                      Start
                    </button>
                  </Link>
                ) : (
                  <span className="text-gray-400 text-sm">No Steps</span>
                )}
              </div>
            </div>
          ))}
          
          {storylines.filter(storyline => storyline.progress !== storyline.step_count).length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 text-lg">No active storylines found.</p>
            </div>
          )}
        </div>
      </div>
    </>

  );
}