import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';

// GET /api/vocab - Get all vocabs for the current user's students
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the guardian
    const guardian = await prisma.guardian.findUnique({
      where: { email: session.user.email },
      include: {
        students: true,
      }
    });

    if (!guardian) {
      return NextResponse.json({ error: 'Guardian not found' }, { status: 404 });
    }

    // Get all vocabs for the guardian's students using a raw query to avoid type issues
    // TODO: convert the raw query to use the ORM API
    const vocabs = await prisma.$queryRaw`
      SELECT v.*, sv.student_id, s.name as student_name
      FROM vocab v
      JOIN student_vocab sv ON v.id = sv.vocab_id
      JOIN student s ON sv.student_id = s.id
      WHERE s.guardian_id = ${guardian.id}
      ORDER BY v.created_at DESC
    `;

    return NextResponse.json(vocabs);
  } catch (error) {
    console.error('Error fetching vocabs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/vocab - Create a new vocab
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, list, studentId } = await request.json();

    if (!title || !list || !studentId) {
      return NextResponse.json(
        { error: 'Title, list, and student ID are required' },
        { status: 400 }
      );
    }

    // Verify that the student belongs to this guardian
    const guardian = await prisma.guardian.findUnique({
      where: { email: session.user.email },
    });

    if (!guardian) {
      return NextResponse.json({ error: 'Guardian not found' }, { status: 404 });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        guardianId: guardian.id,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found or does not belong to this guardian' },
        { status: 404 }
      );
    }

    // Create the vocab using Prisma ORM
    const vocab = await prisma.vocab.create({
      data: {
        title,
        list
      }
    });

    // Create the relationship between student and vocab
    await prisma.studentVocab.create({
      data: {
        student_id: studentId,
        vocab_id: vocab.id
      }
    });

    return NextResponse.json(vocab, { status: 201 });
  } catch (error) {
    console.error('Error creating vocab:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}