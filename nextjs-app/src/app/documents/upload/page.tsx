import { Suspense } from 'react';

export default function UploadDocumentPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-24">
      <h1 className="text-2xl font-bold mb-8">Upload New Document</h1>
      {/* Suspense boundary for potential server components or async operations */}
      <Suspense fallback={<div>Loading form...</div>}>
        <UploadForm />
      </Suspense>
    </main>
  );
}

function UploadForm() {
  // The form action points to the API route we will create next
  // Note: We might need a client component later if we add client-side validation or progress indication
  return (
    <form
      action="/api/documents/upload"
      method="POST"
      encType="multipart/form-data"
      className="w-full max-w-md p-8 bg-white rounded shadow-md"
    >
      <div className="mb-4">
        <label htmlFor="file" className="block text-gray-700 text-sm font-bold mb-2">
          Choose file to upload:
        </label>
        <input
          type="file"
          id="file"
          name="file" // This name must match the key used in the API route
          required
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Upload Document
        </button>
      </div>
    </form>
  );
}