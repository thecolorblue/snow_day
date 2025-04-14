import prisma from '@/lib/prisma'; // Use the singleton instance
import { Document } from '@prisma/client'; // Keep Document type import
import Link from 'next/link';

// Remove direct instantiation

async function getDocuments(): Promise<Document[]> { // Add return type annotation
  try {
    const documents = await prisma.document.findMany({
      orderBy: {
        uploadedAt: 'desc', // Show newest documents first
      },
    });
    return documents;
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    // In a real app, you might want better error handling here
    return [];
  }
  // No need for finally block or $disconnect with the singleton pattern
}

export default async function DocumentsPage() {
  const documents = await getDocuments();

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Uploaded Documents</h1>
          <Link href="/documents/upload" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Upload New Document
          </Link>
        </div>

        {documents.length === 0 ? (
          <p className="text-gray-600">No documents have been uploaded yet.</p>
        ) : (
          <ul className="space-y-4">
            {documents.map((doc: Document) => ( // Add type annotation for doc
              <li key={doc.id} className="p-4 border rounded shadow-sm bg-white">
                <a
                  href={doc.url}
                  target="_blank" // Open in new tab
                  rel="noopener noreferrer" // Security best practice
                  className="text-blue-600 hover:underline font-medium break-all"
                >
                  {/* Display the pathname as the link text */}
                  {doc.pathname}
                </a>
                <p className="text-sm text-gray-500 mt-1">
                  Type: {doc.contentType || 'N/A'} | Uploaded: {new Date(doc.uploadedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

// Revalidate this page periodically or on demand if needed
// export const revalidate = 60; // Revalidate every 60 seconds