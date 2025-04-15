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
    storylineStepId: number,
    formData: FormData
) {
    console.log("Received submission for storyline:", storylineId, "step:", storylineStepId);

    // 1. Extract answers and timing info from FormData
    const answers: AnswerData[] = [];
    const questionIds: number[] = [];
    const pageLoadTime = parseInt(formData.get('pageLoadTime') as string || '0', 10); // Example if time tracking is added

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
                            some: { storyline_step_id: storylineStepId }
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
             console.warn(`Could not find StoryQuestion link for Question ID: ${q.id} in Step ID: ${storylineStepId}`);
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
    const submissionTime = Date.now();
    const durationSeconds = pageLoadTime > 0 ? (submissionTime - pageLoadTime) / 1000 : null;

    // 5. Save progress (attempt) to StorylineProgress
    // We need the story_question_id for each answer to save progress correctly.
    // This requires a more complex approach: iterate through answers, find corresponding
    // story_question_id, and create a progress record for each.

    // Simplified approach: Create one progress record for the step summarizing the attempt.
    // This deviates from the original schema's intent but is simpler for now.
    // A better approach would involve linking progress to specific story_question entries.

    // For now, let's just log the intent to save progress, as saving requires story_question_id mapping.
    console.log("Attempting to save progress (requires story_question_id mapping)...");
    // Example structure if we had the story_question_id:
    /*
    const progressEntries = answers.map(answer => {
        const correctAnswerData = correctAnswersMap.get(answer.questionId);
        const storyQuestionId = correctAnswerData?.storyQuestionId;
        if (!storyQuestionId) return null; // Skip if no link found

        return {
            storyline_id: storylineId,
            storyline_step_id: storylineStepId,
            story_question_id: storyQuestionId,
            score: (answer.submittedAnswer?.trim().toLowerCase() === correctAnswerData.correct.toLowerCase()) ? 1 : 0, // Score per question
            attempts: 1, // Need logic to increment attempts
            duration: durationSeconds, // Or duration per question if tracked
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
    */

    // 6. Revalidate path to show updated progress (if implemented)
    // revalidatePath(`/storyline/${storylineId}/page/${storylineStepId}`);
    // revalidatePath(`/storylines`); // Maybe revalidate dashboard too

    // 7. Return result (e.g., score, or redirect)
    // For now, just return the score
    return {
        score: score,
        totalQuestions: totalQuestions,
        duration: durationSeconds,
        message: "Submission processed (progress saving needs refinement)."
    };
}