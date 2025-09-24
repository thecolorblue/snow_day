import Link from 'next/link';
import AppHeader from '@/components/AppHeader';

interface VocabItem {
  id: number;
  title: string;
  list: string;
  createdAt: string;
  student_vocab: {
    student_id: number;
    student: {
      name: string;
    };
  }[];
}

export default async function VocabViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vocab = await prisma?.vocab.findUnique({
    where: { id: parseInt(id) }
  });

  if (!vocab) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-500">Vocab not found</div>
      </div>
    );
  }

  // Split the list into individual words
  const words = vocab?.list?.split(',').map(word => word.trim()).filter(word => word.length > 0);

  return (
    <>
    <AppHeader></AppHeader>
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Vocabulary Details</h1>
            <Link 
              href="/vocab" 
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Back to List
            </Link>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vocabulary Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Title</p>
                  <p className="text-lg font-medium text-gray-900">{vocab.title}</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Vocabulary Words</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {words.map((word, index) => (
                  <div 
                    key={index} 
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center"
                  >
                    <p className="font-medium text-blue-900">{word}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Link 
                href={`/vocab/create?base_vocab=${vocab.id}`}
                className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Create New Vocab from "{vocab.title}"
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div></>
  );
}