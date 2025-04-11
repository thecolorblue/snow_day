import random
import re
from typing import List, Dict

from src.utils import (
    replace_keywords_with_links,
    generate_tts,
    gen_incorrect_answers,
    QUESTIONS,
    GENRES,
    LOCATIONS,
    STYLES,
    INTERESTS,
    FRIENDS
)
from src.orm import (
    Question, Story, Storyline, StorylineStep, StoryQuestion, db_session
)
# Removed: from src import assignments - will replace this logic

from langchain_openai import ChatOpenAI
from langchain.schema import AIMessage, HumanMessage


# Initialize the LLM
try:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=1)
except Exception as e:
    print(f"Warning: Could not initialize ChatOpenAI: {e}")
    # Create a dummy LLM for testing
    class DummyLLM:
        def __call__(self, messages):
            class DummyResponse:
                content = "This is a dummy response for testing."
            return DummyResponse()
    llm = DummyLLM()


def validate_and_rewrite_paragraph(paragraph: str, required_words: List[str]) -> str | None:
    """
    Checks if a paragraph contains all required words. If not, asks the LLM
    to rewrite it including the missing words.

    Args:
        paragraph: The text paragraph to validate.
        required_words: A list of words that must be present in the paragraph.

    Returns:
        The validated (potentially rewritten) paragraph, or None if rewriting fails.
    """
    missing_words = [word for word in required_words if word.lower() not in paragraph.lower()]

    if not missing_words:
        print("Paragraph contains all required words.")
        return paragraph # No rewrite needed

    print(f"Paragraph missing words: {missing_words}")
    rewrite_prompt = f"""
Rewrite the following paragraph to include the words: {', '.join(missing_words)}.
Keep the meaning and tone of the original paragraph as much as possible.

Original paragraph:
"{paragraph}"

Rewritten paragraph:
"""
    print("--- REWRITE PROMPT ---")
    print(rewrite_prompt)
    print("----------------------")

    try:
        rewritten_paragraph = llm([HumanMessage(content=rewrite_prompt)]).content.strip()
        print("--- LLM REWRITTEN RESPONSE ---")
        print(rewritten_paragraph)
        print("-----------------------------")

        # Basic check if the rewritten paragraph is substantially different or empty
        if not rewritten_paragraph or rewritten_paragraph == paragraph:
             print("Warning: LLM rewrite did not produce a substantially different result or was empty.")
             # Optionally, add a check here to see if the missing words *are* now present
             # If not, maybe retry or return None
             final_missing = [word for word in missing_words if word.lower() not in rewritten_paragraph.lower()]
             if final_missing:
                  print(f"Error: Rewritten paragraph still missing words: {final_missing}")
                  return None # Indicate failure
             else:
                  print("Success: Rewritten paragraph now contains the required words.")
                  return rewritten_paragraph

        return rewritten_paragraph
    except Exception as e:
        print(f"Error calling LLM for rewrite: {e}")
        return None # Indicate failure

def generate_story():
    """
    Generates a story using random questions and user preferences. Uses caching to avoid generating
    a new story unless explicitly requested via `force_new`.
    """

    question_list = random.sample(QUESTIONS, 6)

    word_to_question_map = {q.correct: q for q in question_list}
    required_words = [item.correct for item in question_list]

    genre = random.choice(GENRES)
    location = random.choice(LOCATIONS)
    style = random.choice(STYLES)
    interest1 = random.choice(INTERESTS)
    interest2 = random.choice(INTERESTS)
    friend = random.choice(FRIENDS)

    # Use a unique cache key based on last session and preferences.
    user_prompt = f"""
    Write an {genre} story located in {location} in the style of {style} for Maeve who is 8 years old. It should be very silly. Over the top silly.
    She likes {interest1}, and {interest2}, and her best friend is {friend}.

    Make the story about 2 paragraphs long.

    Include these words in the story: {','.join(required_words)}
    """

    print("--- USER PROMPT ---")
    print(user_prompt)
    print("--------------------")

    # 2. Get raw response from LLM
    try:
        response = llm([HumanMessage(content=user_prompt)]).content
        print("--- LLM RAW RESPONSE ---")
        print(response)
        print("-----------------------")
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return None # Or handle error appropriately

    # 3. Break into paragraphs
    paragraphs = [p.strip() for p in response.split('\n\n') if p.strip()]
    if not paragraphs:
        print("Warning: LLM response did not contain paragraphs separated by double newlines.")
        # Fallback: treat the whole response as one paragraph?
        paragraphs = [response.strip()] if response.strip() else []
        if not paragraphs:
            print("Error: LLM response was empty.")
            return None


    processed_paragraphs = []
    all_questions_map = {} # To store questions created for each unique word

    # 4 & 5. Validate, rewrite (if needed), and link keywords for each paragraph
    for i, para in enumerate(paragraphs):
        print(f"--- PROCESSING PARAGRAPH {i+1} ---")
        validated_para = validate_and_rewrite_paragraph(para, required_words)
        if not validated_para:
            print(f"Skipping paragraph {i+1} due to validation/rewrite failure.")
            continue # Skip this paragraph if validation/rewrite failed

        # Find which required words are actually in the *final* paragraph text
        words_in_para = [word for word in required_words if word in validated_para]
        print(f"Words found in paragraph {i+1}: {words_in_para}")

        # Link keywords in the validated paragraph
        linked_para = replace_keywords_with_links(validated_para, words_in_para)
        print(f"Linked paragraph {i+1}: {linked_para}")

        # Create/retrieve Question objects for words in this paragraph
        para_questions = []
        for word in words_in_para:
            if word not in all_questions_map:
                 # Find the original question details from the initial list
                original_question_details = word_to_question_map.get(word)
                if original_question_details:
                    q = Question(
                        type=random.choice(['input', 'select']), # Decide type here
                        question=original_question_details.question,
                        key=original_question_details.key,
                        correct=original_question_details.correct
                    )
                    if q.type == 'select':
                        q.answers = gen_incorrect_answers(q.correct)
                    all_questions_map[word] = q
                else:
                     print(f"Warning: Could not find original question details for word: {word}")
                     continue # Skip if we can't find the base question
            # Only add if we successfully created/found the question
            if word in all_questions_map:
                para_questions.append(all_questions_map[word])


        processed_paragraphs.append({
            "content": linked_para,
            "raw_content": validated_para, # Store raw for TTS if needed later
            "questions": para_questions
        })
        print("--------------------------")


    # 6. Save Storyline, Steps, Stories, and Questions to DB
    if not processed_paragraphs:
        print("Error: No paragraphs were successfully processed.")
        return None

    try:
        with db_session() as session:
            # Create the main Storyline record
            storyline = Storyline(
                original_request=user_prompt,
                status="GENERATED" # Or some initial status
            )
            session.add(storyline)
            session.flush() # Get storyline.storyline_id

            print(f"Created Storyline ID: {storyline.storyline_id}")

            # Create Story, StoryQuestion, and StorylineStep for each paragraph
            for idx, para_data in enumerate(processed_paragraphs):
                # Create Story (paragraph)
                story_obj = Story(content=para_data["content"])
                session.add(story_obj)
                session.flush() # Get story_obj.id
                print(f"  Created Story ID: {story_obj.id} for step {idx + 1}")


                # Link Story to Questions
                for question_obj in para_data["questions"]:
                     # Check if the question is already in the session, add if not
                    if question_obj not in session:
                         session.add(question_obj)
                         session.flush() # Get question_obj.id if new
                         print(f"    Added Question ID: {question_obj.id} ('{question_obj.correct}') to session")


                    # Ensure question_obj has an ID before creating StoryQuestion
                    if not question_obj.id:
                         session.flush() # Flush again to be sure ID is assigned
                         if not question_obj.id:
                              print(f"Error: Question object for '{question_obj.correct}' did not get an ID.")
                              continue # Skip linking this question


                    story_question_link = StoryQuestion(
                        story_id=story_obj.id,
                        question_id=question_obj.id
                    )
                    session.add(story_question_link)
                    print(f"    Linked Story {story_obj.id} to Question {question_obj.id}")


                # Create StorylineStep
                step = StorylineStep(
                    storyline_id=storyline.storyline_id,
                    step=idx + 1,
                    story_id=story_obj.id
                )
                session.add(step)
                print(f"  Created StorylineStep ID: {step.storyline_step_id} linking Storyline {storyline.storyline_id} to Story {story_obj.id}")


            session.commit()
            print("Storyline and related objects committed to database.")
            # Return the storyline ID or the full object?
            return storyline.storyline_id # Return the ID for now

    except Exception as e:
        print(f"Database error: {e}")
        # Consider rolling back session.rollback()
        return None


    # story_dict = assignments.save_assignment(story, questions) # Old logic removed

    # generate_tts(raw_text, f'assignment-{story_dict["story_id"]}.mp3') # TODO: Update TTS logic if needed