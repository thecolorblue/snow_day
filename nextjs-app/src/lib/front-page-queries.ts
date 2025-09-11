import prisma from './prisma';

export interface StudentStats {
  id: number;
  name: string;
  completedStorylines: number;
  correctAnswers: number;
}

export interface VocabStats {
  id: number;
  title: string;
  numberOfWords: number;
}

export interface StorylineStats {
  storyline_id: number;
  student_name: string;
  pages: number;
  original_request: string | null;
}

export interface FrontPageData {
  students: StudentStats[];
  vocabs: VocabStats[];
  storylines: StorylineStats[];
}

// Student.completedStorylines (student_id, duration) => return number of storylines attached to that student
export async function getCompletedStorylines(studentId: number, duration?: number): Promise<number> {
  const whereClause: any = {
    student_id: studentId,
  };

  if (duration) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - duration);
    whereClause.createdAt = {
      gte: cutoffDate,
    };
  }

  // Count distinct storylines that have progress for this student
  const result = await prisma.storylineProgress.groupBy({
    by: ['storyline_id'],
    where: whereClause,
  });

  return result.length;
}

// Student.correctAnswers (student_id, duration) => return the number of storyline_progress rows for a given student_id in that duration
export async function getCorrectAnswers(studentId: number, duration?: number): Promise<number> {
  const whereClause: any = {
    student_id: studentId,
    score: {
      gt: 0, // Assuming score > 0 means correct answer
    },
  };

  if (duration) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - duration);
    whereClause.createdAt = {
      gte: cutoffDate,
    };
  }

  const count = await prisma.storylineProgress.count({
    where: whereClause,
  });

  return count;
}

// Vocab.numberOfWords (vocab_id) => return the length of the vocab.list value split on ','
export async function getNumberOfWords(vocabId: number): Promise<number> {
  const vocab = await prisma.vocab.findUnique({
    where: { id: vocabId },
    select: { list: true },
  });

  if (!vocab || !vocab.list) {
    return 0;
  }

  return vocab.list.split(',').filter(word => word.trim().length > 0).length;
}

// Storyline.student (storyline_id) => get the student that is assigned to the storyline for storyline_id
export async function getStorylineStudent(storylineId: number): Promise<{ id: number; name: string } | null> {
  // Use raw query to avoid TypeScript issues with the new schema
  const result = await prisma.$queryRaw<Array<{ id: number; name: string }>>`
    SELECT s.id, s.name 
    FROM student s
    JOIN storyline_progress sp ON s.id = sp.student_id
    WHERE sp.storyline_id = ${storylineId}
    LIMIT 1
  `;

  return result.length > 0 ? result[0] : null;
}

// Storyline.pages (storyline_id) => return the number of storyline_steps associated with the storyline_id
export async function getStorylinePages(storylineId: number): Promise<number> {
  const count = await prisma.storylineStep.count({
    where: { storyline_id: storylineId },
  });

  return count;
}

// Get all front page data for a guardian
export async function getFrontPageData(guardianEmail: string): Promise<FrontPageData> {
  // Find the guardian and their students
  const guardian = await prisma.guardian.findUnique({
    where: { email: guardianEmail },
    include: {
      students: true,
    },
  });

  if (!guardian) {
    return { students: [], vocabs: [], storylines: [] };
  }

  // Get student stats (completed storylines and correct answers in the past week)
  const studentStats: StudentStats[] = await Promise.all(
    guardian.students.map(async (student) => {
      const completedStorylines = await getCompletedStorylines(student.id, 7); // Past week
      const correctAnswers = await getCorrectAnswers(student.id, 7); // Past week
      
      return {
        id: student.id,
        name: student.name,
        completedStorylines,
        correctAnswers,
      };
    })
  );

  // Get vocab stats for all vocabs associated with the guardian's students
  const vocabStats: VocabStats[] = [];
  if (guardian.students.length > 0) {
    const studentIds = guardian.students.map(s => s.id);
    
    const vocabs = await prisma.vocab.findMany({
      where: {
        student_vocab: {
          some: {
            student_id: {
              in: studentIds,
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
        list: true,
      },
    });

    for (const vocab of vocabs) {
      const numberOfWords = vocab.list ? vocab.list.split(',').filter(word => word.trim().length > 0).length : 0;
      vocabStats.push({
        id: vocab.id,
        title: vocab.title,
        numberOfWords,
      });
    }
  }

  // Get storyline stats using raw query to avoid TypeScript issues
  const storylineStats: StorylineStats[] = [];
  if (guardian.students.length > 0) {
    const studentIds = guardian.students.map(s => s.id);
    
    const storylines = await prisma.$queryRaw<Array<{
      storyline_id: number;
      student_name: string;
      pages: number;
      original_request: string | null;
    }>>`
      SELECT DISTINCT
        sl.storyline_id,
        s.name as student_name,
        (SELECT COUNT(*) FROM storyline_step ss WHERE ss.storyline_id = sl.storyline_id) as pages,
        sl.original_request
      FROM storyline sl
      JOIN storyline_progress sp ON sl.storyline_id = sp.storyline_id
      JOIN student s ON sp.student_id = s.id
      WHERE sp.student_id = ANY(${studentIds})
    `;

    storylineStats.push(...storylines);
  }

  return {
    students: studentStats,
    vocabs: vocabStats,
    storylines: storylineStats,
  };
}