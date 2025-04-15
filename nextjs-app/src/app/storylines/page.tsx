import Link from 'next/link';
import prisma from '@/lib/prisma'; // Import the Prisma client instance

// Define the expected shape of the data returned by the Prisma query (using snake_case from schema)
type StorylineQueryResult = {
  storyline_id: number;       // Corrected: snake_case
  original_request: string | null; // Corrected: snake_case
  status: string;
  _count: {
    storyline_step: number; // Corrected: relation name is storyline_step
  };
};

// Define the shape of the data used by the component after mapping
type StorylineViewData = {
  storyline_id: number;
  original_request: string | null;
  status: string;
  step_count: number;
};

// Fetch data directly in the Server Component
async function getStorylines() {
  // Fetch the storylines with selected fields and count of steps
  // Fetch the storylines using correct snake_case field names
  const storylines: StorylineQueryResult[] = await prisma.storyline.findMany({
    select: {
      storyline_id: true,       // Corrected: snake_case
      original_request: true, // Corrected: snake_case
      status: true,
      _count: {
        select: { storyline_step: true }, // Corrected: relation name
      },
    },
    orderBy: {
      storyline_id: 'desc',   // Corrected: snake_case
    },
  });

  // Transform the data slightly to match the expected structure (step_count)
  // Map the raw Prisma result to the structure needed by the component
  // Ensure we access the correct properties from the 'storylines' array elements
  // The input 'storyline' here has properties: storylineId, originalRequest, status, _count
  // Map the raw Prisma result to the structure needed by the component
  // Map the raw Prisma result using correct snake_case field names
  return storylines.map((storyline: StorylineQueryResult): StorylineViewData => ({
    storyline_id: storyline.storyline_id,         // Corrected: snake_case
    original_request: storyline.original_request, // Corrected: snake_case
    status: storyline.status,
    step_count: storyline._count.storyline_step,  // Corrected: relation name
  }));
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
    <div className="container mx-auto p-4">
      <div className="text-center mb-5">
        <h1 className="text-3xl font-bold mb-3">Storylines</h1>
        <Link href="/storylines/create">
          <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
            Create New Storyline
          </span>
        </Link>
      </div>

      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Steps</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request (Preview)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {storylines.map((storyline) => (
              <tr key={storyline.storyline_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{storyline.storyline_id}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${getStatusClass(storyline.status)}`}>{storyline.status}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{storyline.step_count}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <pre className="whitespace-pre-wrap break-all font-mono text-xs">{formatRequest(storyline.original_request)}</pre>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {/* Adjust link as needed - maybe link to first step if steps > 0 */}
                  {storyline.step_count > 0 ? (
                     <Link href={`/storyline/${storyline.storyline_id}/page/1`}>
                       <span className="text-indigo-600 hover:text-indigo-900 cursor-pointer">View First Step</span>
                     </Link>
                  ) : (
                    <span className="text-gray-400">No Steps</span>
                  )}
                </td>
              </tr>
            ))}
            {storylines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No storylines found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}