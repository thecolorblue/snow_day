import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';

// GET /api/vocab/[id] - Get a specific vocab by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const vocabId = parseInt(resolvedParams.id);
    
    if (isNaN(vocabId)) {
      return NextResponse.json({ error: 'Invalid vocab ID' }, { status: 400 });
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

    // Check if this vocab belongs to any of the guardian's students
    const vocab = await prisma.vocab.findUnique({
      where: { id: vocabId },
      include: {
        student_vocab: {
          include: {
            student: true
          }
        }
      }
    });

    if (!vocab) {
      return NextResponse.json({ error: 'Vocab not found' }, { status: 404 });
    }

    // Verify that this vocab belongs to one of the guardian's students
    const isValid = vocab.student_vocab.some(sv => 
      guardian.students.some(student => student.id === sv.student_id)
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Vocab not found or does not belong to this guardian' }, { status: 404 });
    }

    return NextResponse.json(vocab);
  } catch (error) {
    console.error('Error fetching vocab:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}