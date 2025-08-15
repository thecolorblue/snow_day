import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const studentId = parseInt(resolvedParams.id);
    
    if (isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    // Find the guardian
    const guardian = await prisma.guardian.findUnique({
      where: { email: session.user.email },
    });

    if (!guardian) {
      return NextResponse.json({ error: 'Guardian not found' }, { status: 404 });
    }

    // Check if the student belongs to this guardian
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

    // Delete the student
    await prisma.student.delete({
      where: { id: studentId },
    });

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}