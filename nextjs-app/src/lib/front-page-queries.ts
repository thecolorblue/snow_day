import { platform } from 'os';
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
  student_id: number;
  pages: number;
  original_request: string | null;
}

export interface DemoStoryline {
  storyline_id: number;
  title: string;
  pages: number;
}

export interface VocabProgress {
  vocab_id: number;
  vocab_title: string;
  total_words: number;
  learned_words: number;
  progress_percentage: number;
}

export interface FrontPageData {
  students: StudentStats[];
  vocabs: VocabStats[];
  storylines: StorylineStats[];
  demoStorylines: DemoStoryline[];
  hasStorylineProgress: boolean;
  vocabProgress: VocabProgress[];
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
    return {
      students: [],
      vocabs: [],
      storylines: [],
      demoStorylines: [],
      hasStorylineProgress: false,
      vocabProgress: []
    };
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
      student_id: number;
      pages: number;
      original_request: string | null;
    }>>`
      SELECT DISTINCT
        sl.storyline_id,
        s.name as student_name,
        s.id as student_id,
        (SELECT COUNT(*) FROM storyline_step ss WHERE ss.storyline_id = sl.storyline_id) as pages,
        sl.original_request
      FROM storyline sl
      JOIN student s ON sl.assigned_to = s.id
      WHERE sl.assigned_to = ANY(${studentIds}) and sl.status != 'finished'
    `;

    storylineStats.push(...storylines);
  }

  // Get demo storylines (storylines with id 52)
  const demoStorylines: DemoStoryline[] = [];
  try {
    const demos = await prisma.$queryRaw<Array<{
      storyline_id: number;
      title: string;
      pages: number;
    }>>`
      SELECT
        sl.storyline_id,
        COALESCE(sl.original_request, 'Demo Storyline') as title,
        (SELECT COUNT(*) FROM storyline_step ss WHERE ss.storyline_id = sl.storyline_id) as pages
      FROM storyline sl
      WHERE sl.storyline_id IN (61)
    `;
    demoStorylines.push(...demos);
  } catch (error) {
    console.error('Error fetching demo storylines:', error);
  }

  // Check if any student has storyline progress
  const hasStorylineProgress = guardian.students.length > 0 && storylineStats.length > 0;

  // Get vocab progress for students
  const vocabProgress: VocabProgress[] = [];
  if (guardian.students.length > 0) {
    const studentIds = guardian.students.map(s => s.id);
    
    try {
      const progress = await prisma.$queryRaw<Array<{
        vocab_id: number;
        vocab_title: string;
        total_words: number;
        learned_words: number;
      }>>`
        SELECT
          v.id as vocab_id,
          v.title as vocab_title,
          CASE
            WHEN v.list IS NULL OR v.list = '' THEN 0
            ELSE ARRAY_LENGTH(STRING_TO_ARRAY(v.list, ','), 1)
          END as total_words,
          COUNT(DISTINCT q.correct) as learned_words
        FROM vocab v
        JOIN student_vocab sv ON v.id = sv.vocab_id
        LEFT JOIN storyline_progress sp ON sv.student_id = sp.student_id
          AND sp.score > 0
        LEFT JOIN story_question sq ON sp.story_question_id = sq.id
        LEFT JOIN question q ON sq.question_id = q.id
          AND q.correct = ANY(STRING_TO_ARRAY(v.list, ','))
        WHERE sv.student_id = ANY(${studentIds})
        GROUP BY v.id, v.list
      `;

      for (const p of progress) {
        const totalWords = Number(p.total_words);
        const learnedWords = Number(p.learned_words);
        vocabProgress.push({
          vocab_id: p.vocab_id,
          vocab_title: p.vocab_title,
          total_words: totalWords,
          learned_words: learnedWords,
          progress_percentage: totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0
        });
      }
    } catch (error) {
      console.error('Error fetching vocab progress:', error);
    }
  }

  return {
    students: studentStats,
    vocabs: vocabStats,
    storylines: storylineStats,
    demoStorylines,
    hasStorylineProgress,
    vocabProgress,
  };
}