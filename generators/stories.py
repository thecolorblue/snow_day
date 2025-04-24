import random
import re
import argparse
import json
import os
import requests
from dotenv import load_dotenv
from typing import List, Dict, Optional, Union

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

# Load environment variables from .env file
load_dotenv()


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


def validate_and_rewrite_paragraph(paragraph: str, required_words: List[str]) -> Union[str, None]:
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

def generate_story(storyline_id: int):
    """
    Generates a story based on a specific Storyline ID, fetching details
    from the database and its original_request JSON field.
    """
    print(f"Generating story for storyline_id: {storyline_id}")
    with db_session() as session: # Start DB session context and get session object
        storyline = session.get(Storyline, storyline_id) # Use SQLAlchemy session.get()
        # Serialize and print the storyline object for debugging
        if not storyline:
            print(f"Error: Storyline with ID {storyline_id} not found.")
            return None
        if not storyline.original_request:
            print(f"Error: Storyline {storyline_id} does not have an original_request.")
            return None
        if storyline.status != 'pending':
            print(f"Error: Storyline {storyline_id} has already been processed.")
            return None

        try:
            request_data = json.loads(storyline.original_request)
            print("Successfully parsed original_request JSON.")
        except json.JSONDecodeError as e:
            print(f"Error parsing original_request JSON for storyline {storyline_id}: {e}")
            return None

        # --- Extract data from request_data ---
        try:
            question_list_data = request_data['question_list'] # List of dicts
            genre = request_data['genre']
            location = request_data['location']
            style = request_data['style']
            selected_interests = request_data.get('selected_interests', []) # Use .get for optional field
            friend = request_data['friend']
            # Assuming 'Maeve' is the user for now, or extract if available
            user_name = "Maeve"
            user_age = 8 # Assuming age, or extract if available
        except KeyError as e:
            print(f"Error: Missing key '{e}' in original_request JSON for storyline {storyline_id}.")
            return None

        if not question_list_data:
             print(f"Error: 'question_list' is empty in original_request for storyline {storyline_id}.")
             return None

        # --- Adapt data for existing logic ---
        word_to_question_map = {q['correct']: q for q in question_list_data}
        required_words = list(word_to_question_map.keys())
        interests_string = ", ".join(selected_interests) if selected_interests else "nothing in particular"

        print(f"Required words: {required_words}")
        print(f"Genre: {genre}, Location: {location}, Style: {style}")
        print(f"Interests: {interests_string}, Friend: {friend}")

        # --- Generate User Prompt ---
        user_prompt = f"""
Write an {genre} story located in {location} in the style of {style} for {user_name} who is {user_age} years old. It should be very silly. Over the top silly.
She likes {interests_string}, and her best friend is {friend}.

Make the story about 4 paragraphs long.
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
            return None # Still inside db_session, but returning early

        # 3. Break into paragraphs
        paragraphs = [p.strip() for p in response.split('\n\n') if p.strip()]
        if not paragraphs:
            print("Warning: LLM response did not contain paragraphs separated by double newlines.")
            paragraphs = [response.strip()] if response.strip() else []
            if not paragraphs:
                print("Error: LLM response was empty.")
                return None # Still inside db_session

        processed_paragraphs = []
        all_questions_map = {} # To store questions created for each unique word

        # Get Vercel Blob token
        vercel_blob_token = os.getenv("BLOB_READ_WRITE_TOKEN")
        if not vercel_blob_token:
            print("Warning: BLOB_READ_WRITE_TOKEN environment variable not set. Audio upload will be skipped.")

        # 4 & 5. Validate, rewrite (if needed), link keywords, and generate/upload audio for each paragraph
        for i, para in enumerate(paragraphs):
            print(f"--- PROCESSING PARAGRAPH {i+1} ---")
            tries = 0
            max_tries = 7

            while tries < max_tries:
                validated_para = validate_and_rewrite_paragraph(para, required_words)
                if not validated_para:
                    print(f"Skipping paragraph {i+1} due to validation/rewrite failure.")

                # Find which required words are actually in the *final* paragraph text
                words_in_para = [word for word in required_words if word.lower().strip() in validated_para.lower()]
                print(f"Words found in paragraph {i+1}: {words_in_para}")

                # Link keywords in the validated paragraph
                linked_para = replace_keywords_with_links(validated_para, words_in_para)
                print(f"Linked paragraph {i+1}: {linked_para}")

                if len(words_in_para) == len(required_words):
                    break

            # Create/retrieve Question objects for words in this paragraph
            para_questions = []
            for word in words_in_para:
                if word not in all_questions_map:
                    # Find the original question details from the parsed JSON data
                    original_question_data = word_to_question_map.get(word) # This is now a dict
                    if original_question_data:
                        q_key = original_question_data.get('key')
                        q_classroom = original_question_data.get('classroom', 'default-classroom') # Extract classroom, provide fallback

                        if not q_key:
                            print(f"Warning: Missing 'key' for word '{word}' in original_request. Skipping question lookup.")
                            continue # Skip if key is missing

                        # --- Fetch Question from DB ---
                        # Assuming 'session' is the active Pony ORM db_session
                        question_obj = session.query(Question).filter_by(key=q_key, classroom=q_classroom).first()

                        if not question_obj:
                            print(f"Warning: Question with key='{q_key}' and classroom='{q_classroom}' not found in the database. Skipping.")
                            # Skip this word if no matching question found in the DB
                            continue

                        # Add the fetched question to the map for later use in linking
                        all_questions_map[word] = question_obj
                        print(f"Found existing question for '{word}': ID={question_obj.id}, Key='{q_key}', Classroom='{q_classroom}'")
                    else:
                        print(f"Warning: Could not find original question data for word: {word}")
                        continue # Skip if we can't find the base question data

                # Add the Question object (if found/created) to this paragraph's list
                if word in all_questions_map:
                    para_questions.append(all_questions_map[word])

            audio_url = None # Initialize audio URL for this paragraph

            if validated_para and vercel_blob_token: # Only proceed if paragraph is valid and token exists
                try:
                    # 1. Generate TTS locally
                    filename_base = f"story_{storyline_id}_para_{i+1}"
                    output_filename = f"{filename_base}.mp3"
                    local_audio_dir = "./media/tts_temp" # Temporary local storage
                    os.makedirs(local_audio_dir, exist_ok=True) # Ensure dir exists
                    local_audio_path = os.path.join(local_audio_dir, output_filename)

                    print(f"Generating TTS for paragraph {i+1}...")
                    # Use validated_para for TTS input
                    generate_tts(validated_para, output_filename, output_dir=local_audio_dir)

                    # Check if file exists after generation
                    if not os.path.exists(local_audio_path):
                         raise FileNotFoundError(f"TTS file not found at {local_audio_path} after generation attempt.")

                    # 2. Upload to Vercel Blob
                    # Add random suffix for uniqueness
                    blob_pathname = f"audio/{filename_base}_{random.randint(1000, 9999)}.mp3"
                    upload_url = f"https://blob.vercel-storage.com/{blob_pathname}"
                    headers = {
                        "Authorization": f"Bearer {vercel_blob_token}",
                        "Content-Type": "audio/mpeg",
                        "x-vercel-blob-client": "python-requests-manual-0.1" # Identify client
                    }

                    print(f"Uploading {local_audio_path} to Vercel Blob at {blob_pathname}...")
                    with open(local_audio_path, "rb") as audio_file:
                        audio_data = audio_file.read()

                    response = requests.put(upload_url, headers=headers, data=audio_data)
                    response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

                    # 3. Get the public URL from response
                    blob_result = response.json()
                    audio_url = blob_result.get("url")
                    if not audio_url:
                        print(f"Warning: Vercel Blob upload successful but no URL found in response for {blob_pathname}.")
                    else:
                        print(f"Vercel Blob upload successful. URL: {audio_url}")

                    # 4. Cleanup local file (optional)
                    try:
                        os.remove(local_audio_path)
                        print(f"Removed temporary local file: {local_audio_path}")
                    except OSError as e:
                        print(f"Warning: Could not remove temporary file {local_audio_path}: {e}")

                except FileNotFoundError as e:
                     print(f"Error during TTS file handling for paragraph {i+1}: {e}")
                except requests.exceptions.RequestException as e:
                    print(f"Error uploading audio to Vercel Blob for paragraph {i+1}: {e}")
                    if hasattr(e, 'response') and e.response is not None:
                         print(f"Vercel Response Status: {e.response.status_code}")
                         print(f"Vercel Response Body: {e.response.text}")
                except Exception as e:
                    print(f"An unexpected error occurred during audio processing for paragraph {i+1}: {e}")

            elif not vercel_blob_token:
                 print(f"Skipping audio generation/upload for paragraph {i+1} due to missing BLOB_READ_WRITE_TOKEN.")
            else: # validated_para was None
                 print(f"Skipping audio generation/upload for paragraph {i+1} because paragraph validation failed.")

            # Append processed data including the audio_url (which might be None)
            processed_paragraphs.append({
                "content": linked_para,
                "raw_content": validated_para, # Keep raw content
                "questions": para_questions,
                "audio_url": audio_url # Add the URL here
            })
            print("--------------------------")

        # --- Save Storyline, Steps, Stories, and Questions to DB ---
        # This section is correctly indented within the `with db_session` block
        if not processed_paragraphs:
            print("Error: No paragraphs were successfully processed after validation/rewriting.")
            # Storyline object exists, but we won't add steps.
            return storyline # Return existing storyline, indicating no steps added

        # Clear existing steps if needed (optional)
        # storyline.steps.clear()

        # session object is already available from the 'with' statement above

        step_number_counter = 1
        for para_data in processed_paragraphs:
            # Create Story object, now including the audio URL
            story_obj = Story(
                content=para_data["content"],
                audio=para_data["audio_url"] # Get URL from processed data
            )
            step = StorylineStep(
                storyline=storyline,
                step=step_number_counter, # Correct keyword argument based on orm.py
                story=story_obj
            )
            session.add(step) # Explicitly add the new step to the session

            for question_obj in para_data["questions"]:
                # Link Questions to Story using SQLAlchemy's relationship management
                # Cascades should handle adding StoryQuestion, but ensure question_obj is handled.
                # If Question objects are created outside the session, they might need adding too.
                # Let's assume Question objects from all_questions_map are transient and need adding
                # when first used in a relationship within the session.
                if question_obj not in session:
                     # Check if it's already pending or persistent to avoid duplicates
                     # A simple check might be session.is_modified(question_obj) or checking its state,
                     # but adding it if not present is often safe if the object has its PK already.
                     # For simplicity, let's rely on SQLAlchemy to manage duplicates if added again.
                     # However, the most robust way is to ensure Questions are fetched/created within the session.
                     # Let's add the StoryQuestion link directly, relying on cascades.
                     pass # Relying on cascade for StoryQuestion for now.

                story_question_link = StoryQuestion(
                    story=story_obj,
                    question=question_obj
                )
                session.add(story_question_link) # Explicitly add the link object
                # session.add(story_question_link) # Cascade should handle this
            step_number_counter += 1

        print(f"Successfully added {step_number_counter - 1} steps to Storyline {storyline.storyline_id}") # Use correct PK attribute name
        storyline.status = 'completed'
        session.add(storyline)
        return storyline # Return the updated storyline object
    # End of `with db_session` context

# --- Command Line Execution ---
# This block is now at the top level (correct indentation)
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a story for a given Storyline ID.")
    parser.add_argument("storyline_id", type=int, help="The ID of the Storyline to generate the story for.")
    args = parser.parse_args()

    print(f"Received request to generate story for Storyline ID: {args.storyline_id}")
    # generate_story handles its own db_session
    generated_storyline = generate_story(args.storyline_id)

    if generated_storyline:
        # Re-enter db_session to safely access potentially lazy-loaded attributes for printing
        with db_session() as session: # Get session object
            storyline_to_print = session.get(Storyline, args.storyline_id) # Re-fetch using SQLAlchemy session.get()
            print(f"\nSuccessfully generated and saved story for Storyline ID: {storyline_to_print.storyline_id}") # Use correct PK attribute name
            print(storyline_to_print)
            if storyline_to_print and storyline_to_print.steps:
                 print(f"  Number of steps created: {len(storyline_to_print.steps)}")
                 # Sort the steps in Python after loading
                 sorted_steps = sorted(storyline_to_print.steps, key=lambda s: s.step)
                 for i, step in enumerate(sorted_steps):
                    print(f"  Step {i+1}:")
                    print(f"    Story Content (first 50 chars): {step.story.content[:50]}...")
                    # Accessing questions requires the session
                    question_keys = [q.key for q in step.story.questions]
                    print(f"    Questions: {question_keys}")
            elif storyline_to_print:
                 print("  No steps were added to the storyline (e.g., processing failed).")
            else:
                 print("Could not re-fetch storyline details for printing.")
    else:
        print(f"\nFailed to generate story for Storyline ID: {args.storyline_id}")