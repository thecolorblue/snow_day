import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, friends, interests } = await request.json();

    if (!name || !friends || !interests) {
      return NextResponse.json(
        { error: 'Name, friends, and interests are required' },
        { status: 400 }
      );
    }

    // Find the guardian
    const guardian = await prisma.guardian.findUnique({
      where: { email: session.user.email },
    });

    if (!guardian) {
      return NextResponse.json({ error: 'Guardian not found' }, { status: 404 });
    }

    // Create the student
    const student = await prisma.student.create({
      data: {
        name,
        friends,
        interests,
        guardianId: guardian.id,
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}