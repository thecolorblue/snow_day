import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface CumulativeAttemptPoint {
  date: string;
  attempts: number;
}

interface TopQuestion {
  question: string;
  attempts: number;
}

interface ChartData {
  cumulativeAttempts: {
    week: CumulativeAttemptPoint[];
    month: CumulativeAttemptPoint[];
  };
  averageAttempts: {
    week: number;
    month: number;
  };
  topQuestions: {
    week: TopQuestion[];
    month: TopQuestion[];
  };
}

interface StudentInfo {
  id: number;
  name: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ student_id: string }> }
) {
  try {
    const resolvedParams = await params;
    const studentId = parseInt(resolvedParams.student_id);
    
    if (isNaN(studentId)) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }

    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const studentInfo: StudentInfo = {
      id: student.id,
      name: student.name,
    };

    // Calculate date ranges
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get cumulative attempts data
    const cumulativeAttemptsWeek = await getCumulativeAttempts(studentId, weekAgo, now);
    const cumulativeAttemptsMonth = await getCumulativeAttempts(studentId, monthAgo, now);

    // Get average attempts data
    const averageAttemptsWeek = await getAverageAttempts(studentId, weekAgo);
    const averageAttemptsMonth = await getAverageAttempts(studentId, monthAgo);

    // Get top questions data
    const topQuestionsWeek = await getTopQuestions(studentId, weekAgo);
    const topQuestionsMonth = await getTopQuestions(studentId, monthAgo);

    const chartData: ChartData = {
      cumulativeAttempts: {
        week: cumulativeAttemptsWeek,
        month: cumulativeAttemptsMonth,
      },
      averageAttempts: {
        week: averageAttemptsWeek,
        month: averageAttemptsMonth,
      },
      topQuestions: {
        week: topQuestionsWeek,
        month: topQuestionsMonth,
      },
    };

    return NextResponse.json({
      studentInfo,
      chartData,
    });
  } catch (error) {
    console.error('Error fetching student stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getCumulativeAttempts(
  studentId: number,
  startDate: Date,
  endDate: Date
): Promise<CumulativeAttemptPoint[]> {
  // Get all storyline progress records for the student in the date range
  const progressRecords = await prisma.storylineProgress.findMany({
    where: {
      student_id: studentId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      attempts: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by date and calculate cumulative attempts
  const dateMap = new Map<string, number>();
  let cumulativeAttempts = 0;

  for (const record of progressRecords) {
    if (record.createdAt && record.attempts) {
      const dateKey = record.createdAt.toISOString().split('T')[0];
      cumulativeAttempts += record.attempts;
      dateMap.set(dateKey, cumulativeAttempts);
    }
  }

  // Fill in missing dates with previous cumulative value
  const result: CumulativeAttemptPoint[] = [];
  const currentDate = new Date(startDate);
  let lastCumulative = 0;

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const dayAttempts = dateMap.get(dateKey) || lastCumulative;
    
    result.push({
      date: dateKey,
      attempts: dayAttempts,
    });

    lastCumulative = dayAttempts;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

async function getAverageAttempts(studentId: number, startDate: Date): Promise<number> {
  const result = await prisma.storylineProgress.aggregate({
    where: {
      student_id: studentId,
      createdAt: {
        gte: startDate,
      },
      attempts: {
        not: null,
      },
    },
    _avg: {
      attempts: true,
    },
  });

  return result._avg.attempts || 0;
}

async function getTopQuestions(studentId: number, startDate: Date): Promise<TopQuestion[]> {
  // Use raw query to get questions with highest attempts
  const result = await prisma.$queryRaw<Array<{
    question: string;
    total_attempts: bigint;
  }>>`
    SELECT 
      q.correct as question,
      SUM(sp.attempts) as total_attempts
    FROM storyline_progress sp
    JOIN story_question sq ON sp.story_question_id = sq.id
    JOIN question q ON sq.question_id = q.id
    WHERE sp.student_id = ${studentId}
      AND sp.created_at >= ${startDate}
      AND sp.attempts IS NOT NULL
    GROUP BY q.correct
    ORDER BY total_attempts DESC
    LIMIT 20
  `;

  return result.map(row => ({
    question: row.question,
    attempts: Number(row.total_attempts),
  }));
}