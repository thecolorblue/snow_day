import prisma from '@/lib/prisma'; // Assuming singleton instance exists
import { Student } from '@prisma/client';
import Link from 'next/link';

async function getStudents(): Promise<Student[]> {
  try {
    const students = await prisma.student.findMany({
      orderBy: {
        createdAt: 'desc', // Show newest students first
      },
    });
    return students;
  } catch (error) {
    console.error("Failed to fetch students:", error);
    // Consider more robust error handling for production
    return [];
  }
  // No need for finally block or $disconnect with the singleton pattern
}

export default async function StudentsPage() {
  const students = await getStudents();

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Students</h1>
          <Link href="/students/add" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Add New Student
          </Link>
        </div>

        {students.length === 0 ? (
          <p className="text-gray-600">No students found.</p>
        ) : (
          <ul className="space-y-4">
            {students.map((student: Student) => (
              <li key={student.id} className="p-4 border rounded shadow-sm bg-white">
                <div className="font-medium">Student ID: {student.id}</div> {/* Or display a name if added later */}
                <p className="text-sm text-gray-700 mt-1">Genre: {student.genre}</p>
                <p className="text-sm text-gray-700">Location: {student.location}</p>
                <p className="text-sm text-gray-700">Style: {student.style}</p>
                <p className="text-sm text-gray-700">Interests: {student.interests.join(', ')}</p>
                <p className="text-sm text-gray-700">Friends: {student.friends.join(', ')}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(student.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

// Optional: Revalidate this page periodically or on demand if needed
// export const revalidate = 60; // Revalidate every 60 seconds