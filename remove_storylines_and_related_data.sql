-- SQL Script to Remove Storylines and All Related Data
-- This script removes storylines by their IDs and cascades the deletion to related data
-- while being careful not to delete stories/questions used by other storylines

-- Usage: Replace the storyline_ids_to_delete array with actual storyline IDs
-- Example: ARRAY[1, 2, 3, 4] for storylines with IDs 1, 2, 3, and 4

BEGIN;

DO $$
DECLARE
    storyline_ids_to_delete INTEGER[] := ARRAY[1, 2, 3]; -- REPLACE WITH ACTUAL STORYLINE IDS
    storyline_id INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Validate that all storyline IDs exist
    SELECT COUNT(*) INTO deleted_count
    FROM storyline 
    WHERE storyline_id = ANY(storyline_ids_to_delete);
    
    IF deleted_count = 0 THEN
        RAISE NOTICE 'No storylines found with the provided IDs';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found % storyline(s) to delete', deleted_count;
    
    -- Step 1: Delete storyline_progress records
    DELETE FROM storyline_progress 
    WHERE storyline_id = ANY(storyline_ids_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % storyline progress records', deleted_count;
    
    -- Step 2: Delete storyline_step records
    -- (These would cascade when storylines are deleted, but we'll be explicit)
    DELETE FROM storyline_step 
    WHERE storyline_id = ANY(storyline_ids_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % storyline step records', deleted_count;
    
    -- Step 3: Delete story_question records for stories that are ONLY used by these storylines
    DELETE FROM story_question 
    WHERE story_id IN (
        -- Get stories that are only referenced by the storylines we're deleting
        SELECT DISTINCT ss.story_id
        FROM storyline_step ss
        WHERE ss.storyline_id = ANY(storyline_ids_to_delete)
        AND ss.story_id NOT IN (
            -- Exclude stories that are also used by other storylines
            SELECT DISTINCT ss2.story_id
            FROM storyline_step ss2
            WHERE ss2.storyline_id != ALL(storyline_ids_to_delete)
        )
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % story question records', deleted_count;
    
    -- Step 4: Delete questions that are ONLY referenced by the story_questions we just deleted
    DELETE FROM question 
    WHERE id IN (
        -- Get questions that were only used by stories exclusive to our storylines
        SELECT DISTINCT sq.question_id
        FROM story_question sq
        JOIN storyline_step ss ON sq.story_id = ss.story_id
        WHERE ss.storyline_id = ANY(storyline_ids_to_delete)
        AND sq.story_id IN (
            -- Only for stories that are exclusive to our storylines
            SELECT DISTINCT ss1.story_id
            FROM storyline_step ss1
            WHERE ss1.storyline_id = ANY(storyline_ids_to_delete)
            AND ss1.story_id NOT IN (
                SELECT DISTINCT ss2.story_id
                FROM storyline_step ss2
                WHERE ss2.storyline_id != ALL(storyline_ids_to_delete)
            )
        )
        AND sq.question_id NOT IN (
            -- Exclude questions used by other stories
            SELECT DISTINCT sq2.question_id
            FROM story_question sq2
            WHERE sq2.story_id NOT IN (
                SELECT DISTINCT ss3.story_id
                FROM storyline_step ss3
                WHERE ss3.storyline_id = ANY(storyline_ids_to_delete)
                AND ss3.story_id NOT IN (
                    SELECT DISTINCT ss4.story_id
                    FROM storyline_step ss4
                    WHERE ss4.storyline_id != ALL(storyline_ids_to_delete)
                )
            )
        )
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % question records', deleted_count;
    
    -- Step 5: Delete stories that are ONLY used by these storylines
    DELETE FROM story 
    WHERE id IN (
        SELECT DISTINCT ss.story_id
        FROM storyline_step ss
        WHERE ss.storyline_id = ANY(storyline_ids_to_delete)
        AND ss.story_id NOT IN (
            -- Exclude stories that are also used by other storylines
            SELECT DISTINCT ss2.story_id
            FROM storyline_step ss2
            WHERE ss2.storyline_id != ALL(storyline_ids_to_delete)
        )
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % story records', deleted_count;
    
    -- Step 6: Delete the storylines themselves
    DELETE FROM storyline 
    WHERE storyline_id = ANY(storyline_ids_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % storyline records', deleted_count;
    
    RAISE NOTICE 'Successfully completed deletion of storylines and related data';
    
END $$;

COMMIT;

-- Alternative simpler version that deletes everything regardless of other references:
-- WARNING: This version will delete stories and questions even if they're used by other storylines
-- Uncomment only if you're sure you want to delete all related data

/*
BEGIN;

DO $$
DECLARE
    storyline_ids_to_delete INTEGER[] := ARRAY[1, 2, 3]; -- REPLACE WITH ACTUAL STORYLINE IDS
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE 'WARNING: This will delete ALL related stories and questions, even if used elsewhere';
    
    -- Step 1: Delete storyline_progress
    DELETE FROM storyline_progress WHERE storyline_id = ANY(storyline_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % storyline progress records', deleted_count;
    
    -- Step 2: Delete storyline_step
    DELETE FROM storyline_step WHERE storyline_id = ANY(storyline_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % storyline step records', deleted_count;
    
    -- Step 3: Delete story_question for all related stories
    DELETE FROM story_question 
    WHERE story_id IN (
        SELECT DISTINCT story_id FROM storyline_step 
        WHERE storyline_id = ANY(storyline_ids_to_delete)
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % story question records', deleted_count;
    
    -- Step 4: Delete all questions from deleted story_questions
    DELETE FROM question 
    WHERE id IN (
        SELECT DISTINCT question_id FROM story_question 
        JOIN storyline_step ON story_question.story_id = storyline_step.story_id
        WHERE storyline_step.storyline_id = ANY(storyline_ids_to_delete)
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % question records', deleted_count;
    
    -- Step 5: Delete all stories
    DELETE FROM story 
    WHERE id IN (
        SELECT DISTINCT story_id FROM storyline_step 
        WHERE storyline_id = ANY(storyline_ids_to_delete)
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % story records', deleted_count;
    
    -- Step 6: Delete storylines
    DELETE FROM storyline WHERE storyline_id = ANY(storyline_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % storyline records', deleted_count;
    
END $$;

COMMIT;
*/