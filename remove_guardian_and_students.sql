-- SQL Script to Remove a Guardian and All Associated Students
-- This script removes a guardian by email and cascades the deletion to associated students
-- while maintaining referential integrity

-- Usage: Replace 'guardian@example.com' with the actual guardian email
-- Or modify to use guardian ID instead

BEGIN;

-- Store the guardian ID for reference
DO $$
DECLARE
    guardian_id_to_delete INTEGER;
BEGIN
    -- Get the guardian ID by email (modify this condition as needed)
    SELECT id INTO guardian_id_to_delete 
    FROM guardian 
    WHERE email = 'guardian@example.com'; -- REPLACE WITH ACTUAL EMAIL
    
    -- Check if guardian exists
    IF guardian_id_to_delete IS NULL THEN
        RAISE NOTICE 'Guardian with email "guardian@example.com" not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found guardian with ID: %', guardian_id_to_delete;
    
    -- Step 1: Delete from student_vocab table (CASCADE will handle this automatically when students are deleted)
    -- But we'll do it explicitly for clarity
    DELETE FROM student_vocab 
    WHERE student_id IN (
        SELECT id FROM student WHERE guardian_id = guardian_id_to_delete
    );
    
    RAISE NOTICE 'Deleted student vocabulary associations';
    
    -- Step 2: Update storyline_progress to set student_id to NULL
    -- (The schema has onDelete: SetNull, but we'll handle it explicitly)
    UPDATE storyline_progress 
    SET student_id = NULL 
    WHERE student_id IN (
        SELECT id FROM student WHERE guardian_id = guardian_id_to_delete
    );
    
    RAISE NOTICE 'Updated storyline progress records (set student_id to NULL)';
    
    -- Step 3: Delete all students associated with the guardian
    DELETE FROM student 
    WHERE guardian_id = guardian_id_to_delete;
    
    RAISE NOTICE 'Deleted students associated with guardian';
    
    -- Step 4: Delete the guardian
    DELETE FROM guardian 
    WHERE id = guardian_id_to_delete;
    
    RAISE NOTICE 'Deleted guardian with ID: %', guardian_id_to_delete;
    
END $$;

COMMIT;

-- Alternative version using guardian ID instead of email:
-- Uncomment the section below and comment out the above if you prefer to use guardian ID

/*
BEGIN;

DO $$
DECLARE
    guardian_id_to_delete INTEGER := 1; -- REPLACE WITH ACTUAL GUARDIAN ID
BEGIN
    -- Check if guardian exists
    IF NOT EXISTS (SELECT 1 FROM guardian WHERE id = guardian_id_to_delete) THEN
        RAISE NOTICE 'Guardian with ID % not found', guardian_id_to_delete;
        RETURN;
    END IF;
    
    RAISE NOTICE 'Processing guardian with ID: %', guardian_id_to_delete;
    
    -- Step 1: Delete from student_vocab table
    DELETE FROM student_vocab 
    WHERE student_id IN (
        SELECT id FROM student WHERE guardian_id = guardian_id_to_delete
    );
    
    RAISE NOTICE 'Deleted student vocabulary associations';
    
    -- Step 2: Update storyline_progress to set student_id to NULL
    UPDATE storyline_progress 
    SET student_id = NULL 
    WHERE student_id IN (
        SELECT id FROM student WHERE guardian_id = guardian_id_to_delete
    );
    
    RAISE NOTICE 'Updated storyline progress records (set student_id to NULL)';
    
    -- Step 3: Delete all students associated with the guardian
    DELETE FROM student 
    WHERE guardian_id = guardian_id_to_delete;
    
    RAISE NOTICE 'Deleted students associated with guardian';
    
    -- Step 4: Delete the guardian
    DELETE FROM guardian 
    WHERE id = guardian_id_to_delete;
    
    RAISE NOTICE 'Deleted guardian with ID: %', guardian_id_to_delete;
    
END $$;

COMMIT;
*/