import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Use the singleton instance

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      orderBy: {
        createdAt: 'desc', // Optional: order by creation date
      },
    });
    return NextResponse.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
  // No finally block needed for $disconnect with the singleton pattern
}

export async function POST(request: Request) {
  // Using the imported singleton prisma instance
  try {
    const body = await request.json();
    const { genre, location, style, interests, friends } = body;

    // Basic validation
    if (!genre || !location || !style) {
      return NextResponse.json(
        { error: 'Genre, Location, and Style are required fields.' },
        { status: 400 }
      );
    }

    // Ensure arrays are handled correctly (even if empty)
    const interestsArray = Array.isArray(interests) ? interests : [];
    const friendsArray = Array.isArray(friends) ? friends : [];


    const newStudent = await prisma.student.create({
      data: {
        genre,
        location,
        style,
        interests: interestsArray,
        friends: friendsArray,
        // createdAt is handled by @default(now())
      },
    });

    return NextResponse.json(newStudent, { status: 201 }); // 201 Created status
  } catch (error) {
    console.error('Error creating student:', error);
    // More specific error handling could be added here (e.g., validation errors)
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 }
    );
  }
  // No finally block needed for $disconnect with the singleton pattern
}