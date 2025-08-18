"use server";

import prisma from '@/lib/prisma';

// Define the expected structure for form data processing
interface AnswerData {
    questionId: number;
    submittedAnswer: string | null;
    // Add timing data if implemented (e.g., lastEditTimestamp)
}

export async function submitStorylineStepAction(
    storylineId: number,
    storylineStep: number,
    formData: FormData
) {
    console.log("Received submission for storyline:", storylineId, "step:", storylineStep);

    // 1. Extract answers and timing info from FormData
    const answers: AnswerData[] = [];
    const questionIds: number[] = [];

    for (const [key, value] of formData.entries()) {
        if (key.startsWith('question_')) {
            const questionId = parseInt(key.split('_')[1], 10);
            if (!isNaN(questionId)) {
                answers.push({
                    questionId: questionId,
                    submittedAnswer: value as string,
                });
                if (!questionIds.includes(questionId)) {
                    questionIds.push(questionId);
                }
            }
        }
        // Extract timing data here if implemented
    }

    console.log("Parsed Answers:", answers);

    if (questionIds.length === 0) {
        throw new Error("No questions found in submission.");
    }

    // 2. Fetch correct answers for the submitted questions
    const questionsData = await prisma.question.findMany({
        where: {
            id: { in: questionIds },
        },
        select: {
            id: true,
            correct: true,
            story_question: { // Need story_question_id for progress record
                where: {
                    story: {
                        storyline_step: {
                            some: {
                                step: storylineStep,
                                storyline_id: storylineId
                            }
                        }
                    }
                },
                select: { id: true },
                take: 1 // Should only be one link per question per step's story
            }
        },
    });

    if (!questionsData || questionsData.length === 0) {
        throw new Error("Could not retrieve question data for scoring.");
    }

    // Map for easy lookup: questionId -> { correct: string, storyQuestionId: number }
    const correctAnswersMap = new Map<number, { correct: string, storyQuestionId: number | null }>();
    questionsData.forEach(q => {
        // Ensure story_question exists and has an id
        const storyQuestionId = q.story_question?.[0]?.id ?? null;
        if (storyQuestionId === null) {
             console.warn(`Could not find StoryQuestion link for Question ID: ${q.id} in Step ID: ${storylineStep}`);
        }
        correctAnswersMap.set(q.id, { correct: q.correct, storyQuestionId });
    });


    // 3. Calculate score
    let score = 0;
    const totalQuestions = answers.length; // Or questionIds.length

    answers.forEach(answer => {
        const correctAnswerData = correctAnswersMap.get(answer.questionId);
        if (correctAnswerData && answer.submittedAnswer?.trim().toLowerCase() === correctAnswerData.correct.toLowerCase()) {
            score++;
        }
    });

    console.log(`Score: ${score}/${totalQuestions}`);

    // 4. Calculate duration (example if time tracking is added)
    const durationSeconds = formData.get('timeElapsed') ? parseFloat(formData.get('timeElapsed') as string) : null; // Use timeElapsed from form data

    // 5. Save progress (attempt) to StorylineProgress
    // We need the story_question_id for each answer to save progress correctly.
    // This requires a more complex approach: iterate through answers, find corresponding
    // story_question_id, and create a progress record for each.

    // Simplified approach: Create one progress record for the step summarizing the attempt.
    // This deviates from the original schema's intent but is simpler for now.
    // A better approach would involve linking progress to specific story_question entries.

    // For now, let's just log the intent to save progress, as saving requires story_question_id mapping.
    // 5. Find the actual StorylineStep record ID using storyline_id and step number
    const stepRecord = await prisma.storylineStep.findFirst({
        where: {
            storyline_id: storylineId, // Filter by storyline ID
            step: storylineStep,       // Filter by step number
        },
        select: { storyline_step_id: true }, // Select the correct primary key field
    });

    if (!stepRecord) {
        console.error(`Could not find StorylineStep record for storyline ${storylineId}, step ${storylineStep}`);
        throw new Error(`Could not find the specified storyline step.`);
    }
    const actualStorylineStepId = stepRecord.storyline_step_id; // Use the correct field name
    console.log(`Found StorylineStep ID: ${actualStorylineStepId}`);

    // 6. Prepare and save progress entries
    const progressEntries = answers.map(answer => {
        const correctAnswerData = correctAnswersMap.get(answer.questionId);
        const storyQuestionId = correctAnswerData?.storyQuestionId;
        if (!storyQuestionId) return null; // Skip if no link found

        return {
            storyline_id: storylineId,
            storyline_step_id: actualStorylineStepId, // Use the fetched ID
            story_question_id: storyQuestionId,
            score: (answer.submittedAnswer?.trim().toLowerCase() === correctAnswerData.correct.toLowerCase()) ? 1 : 0, // Score per question
            // Get attempts from FormData (assuming it's sent like 'attempts_QUESTIONID')
            attempts: parseInt(formData.get(`attempts_${answer.questionId}`) as string || '1', 10),
            duration: durationSeconds,
            createdAt: new Date(), // Add current timestamp
        };
    }).filter(entry => entry !== null); // Remove null entries

    if (progressEntries.length > 0) {
        try {
            await prisma.storylineProgress.createMany({
                data: progressEntries,
            });
            console.log("Progress saved successfully.");
        } catch (error) {
            console.error("Error saving storyline progress:", error);
            // Handle error appropriately
        }
    }

    // 7. Revalidate path to show updated progress (if implemented)
    // revalidatePath(`/storyline/${storylineId}/page/${storylineStep}`);
    // revalidatePath(`/storylines`); // Maybe revalidate dashboard too

    // 8. Return result
    return {
        score: score,
        totalQuestions: totalQuestions,
        duration: durationSeconds,
        message: "Submission processed (progress saving needs refinement)."
    };
}
