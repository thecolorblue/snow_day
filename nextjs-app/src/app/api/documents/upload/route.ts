import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Use the singleton instance

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename'); // Vercel Blob suggests passing filename via query param

  // 1. Get file from form data
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  // Use the file's name if filename query param is not provided
  const finalFilename = filename || file.name;

  try {
    // 2. Upload file to Vercel Blob
    // The request body needs to be passed directly to put
    const blob = await put(finalFilename, file, {
      access: 'public', // Make the blob publicly accessible
      token: process.env.BLOB_READ_WRITE_TOKEN, // Pass the token
      // Add any other options like contentType if needed, Vercel often infers it
    });

    // 3. Save blob metadata to database
    await prisma.Document.create({
      data: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        contentDisposition: blob.contentDisposition,
        // uploadedAt is handled by @default(now()) in schema
      },
    });

    // 4. Redirect to the documents list page after successful upload
    // Use the absolute URL for redirection from server-side route handlers
    const documentsUrl = new URL('/documents', request.url).toString();
    return NextResponse.redirect(documentsUrl, 303); // 303 See Other for POST redirect

  } catch (error) {
    console.error('Upload failed:', error);
    // Provide a more specific error message if possible
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during upload.';
    return NextResponse.json({ error: `Upload failed: ${errorMessage}` }, { status: 500 });
  }
  // No need for finally block or $disconnect with the singleton pattern
}

// Optional: Add configuration for body parsing if needed,
// but Next.js 13+ App Router handles FormData automatically for API routes.
// export const config = {
//   api: {
//     bodyParser: false, // Disable default body parsing to handle FormData
//   },
// };