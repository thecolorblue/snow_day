import os
import yaml
import argparse
import random
import json
from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

# Assuming src is in the python path or PYTHONPATH is set correctly
from src.orm import Question, db_session

# --- Configuration ---
DEFAULT_YAML_PATH = 'data/classroom_words.yaml'
# OPENAI_ENV_VAR = 'OPENAI_API_KEY' # Removed constant, using string directly
OPENAI_MODEL = 'gpt-4o-mini'

# --- Load Environment Variables ---
load_dotenv()

# --- Initialize OpenAI Client ---
# Load the API key directly using the expected name from the .env file
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("Error: Environment variable 'OPENAI_API_KEY' not set. Ensure it's defined in your .env file.")

try:
    client = OpenAI(api_key=api_key)
except Exception as e:
    print(f"Error initializing OpenAI client: {e}")
    # Consider adding fallback or exiting if OpenAI is essential
    client = None

def generate_incorrect_spellings(word: str, count: int = 4) -> list[str]:
    """
    Generates a specified number of incorrect spellings for a given word using OpenAI.
    """
    if not client:
        print("OpenAI client not initialized. Skipping generation.")
        return []

    prompt = f"""
Generate exactly {count} common but incorrect spellings for the word "{word}".
Focus on plausible mistakes a learner might make (e.g., phonetic errors, letter swaps, common misspellings).
Do not include the correct spelling in your response.
Return ONLY the incorrect spellings as a JSON list of strings.

Example for word "separate":
["seperate", "seperete", "seprate", "separat"]

Word: "{word}"
Incorrect spellings (JSON list):
"""
    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"} # Request JSON output
        )
        # Assuming the response structure contains the JSON list directly or under a key
        # Adjust parsing based on actual API response structure if needed
        content = response.choices[0].message.content
        # Try to parse the JSON content
        try:
            # Look for a JSON list within the content string
            json_match = json.loads(content)
            # Check if it's a list and contains strings
            if isinstance(json_match, list) and all(isinstance(item, str) for item in json_match):
                 # Ensure we have the correct count, truncate or pad if necessary (though the prompt requests exact count)
                incorrect_spellings = json_match[:count]
                while len(incorrect_spellings) < count:
                    # Basic fallback if API returns fewer than requested - generate simple variations
                    incorrect_spellings.append(word + random.choice(['e', 'a', 'i']) + random.choice(['r', 's', 't']))
                print(f"Generated incorrect spellings for '{word}': {incorrect_spellings}")
                return incorrect_spellings
            else:
                 # Attempt to extract list if nested, e.g. {"spellings": [...]}
                if isinstance(json_match, dict):
                    for key, value in json_match.items():
                        if isinstance(value, list) and all(isinstance(item, str) for item in value):
                             incorrect_spellings = value[:count]
                             # Pad if necessary
                             while len(incorrect_spellings) < count:
                                incorrect_spellings.append(word + random.choice(['e', 'a', 'i']) + random.choice(['r', 's', 't']))
                             print(f"Generated incorrect spellings for '{word}' (extracted from dict): {incorrect_spellings}")
                             return incorrect_spellings
                print(f"Warning: OpenAI response for '{word}' was not a simple JSON list: {content}")
                return [] # Indicate failure to get expected format

        except json.JSONDecodeError:
            print(f"Warning: Could not parse JSON from OpenAI response for '{word}': {content}")
            # Fallback: Try simple regex to find comma-separated words if JSON fails
            words = [w.strip().strip('"\'') for w in content.split(',') if w.strip()]
            if len(words) >= count:
                print(f"Generated incorrect spellings for '{word}' (fallback parsing): {words[:count]}")
                return words[:count]
            else:
                 print(f"Error: Fallback parsing failed for '{word}'.")
                 return [] # Indicate failure

    except OpenAIError as e:
        print(f"Error calling OpenAI API for word '{word}': {e}")
        return [] # Indicate failure
    except Exception as e:
        print(f"An unexpected error occurred during OpenAI call for '{word}': {e}")
        return [] # Indicate failure


def main(yaml_path: str):
    """
    Reads words from a YAML file, generates incorrect spellings,
    and creates Question objects in the database.
    """
    print(f"Processing YAML file: {yaml_path}")

    try:
        with open(yaml_path, 'r') as f:
            data = yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Error: YAML file not found at {yaml_path}")
        return
    except yaml.YAMLError as e:
        print(f"Error parsing YAML file {yaml_path}: {e}")
        return
    except Exception as e:
        print(f"An unexpected error occurred reading {yaml_path}: {e}")
        return

    if not isinstance(data, dict):
        print(f"Error: Expected YAML root to be a dictionary, but got {type(data)}")
        return

    questions_created = 0
    questions_failed = 0

    with db_session() as session:
        for classroom_name, words in data.items():
            if not isinstance(words, list):
                print(f"Warning: Skipping key '{classroom_name}' as its value is not a list.")
                continue

            print(f"\nProcessing classroom: {classroom_name}")
            for word in words:
                if not isinstance(word, str) or not word:
                    print(f"Warning: Skipping invalid word entry: {word}")
                    continue

                word = word.strip().lower() # Normalize word
                print(f"  Processing word: {word}")

                # Check if a question for this word and classroom already exists
                existing_question = session.query(Question).filter_by(
                    key=word,
                    classroom=classroom_name,
                    type='spelling' # Assuming type is 'spelling'
                ).first()

                if existing_question:
                    print(f"    Question for '{word}' in classroom '{classroom_name}' already exists. Skipping.")
                    continue

                # Generate incorrect spellings
                incorrect_spellings = generate_incorrect_spellings(word, count=4)

                if not incorrect_spellings or len(incorrect_spellings) != 4:
                    print(f"    Failed to generate sufficient incorrect spellings for '{word}'. Skipping.")
                    questions_failed += 1
                    continue

                # Prepare answers list (correct + incorrect) and shuffle
                all_answers = [word] + incorrect_spellings
                random.shuffle(all_answers)
                answers_str = ",".join(all_answers)

                # Create Question object
                new_question = Question(
                    type='select',
                    question=f"Which is the correct spelling of the word '{word}'?",
                    key=word,
                    correct=word,
                    answers=answers_str,
                    classroom=classroom_name
                )

                try:
                    session.add(new_question)
                    session.flush() # Use flush to assign ID if needed before commit
                    print(f"    Successfully created question for '{word}'. ID: {new_question.id}")
                    questions_created += 1
                except Exception as e:
                    print(f"    Error adding question for '{word}' to database session: {e}")
                    session.rollback() # Rollback this specific question addition
                    questions_failed += 1

        try:
            session.commit()
            print("\nDatabase commit successful.")
        except Exception as e:
            print(f"\nError committing changes to database: {e}")
            session.rollback() # Rollback the entire transaction on final commit error
            # Adjust counts as the transaction failed
            questions_created = 0 # Reset count as commit failed
            # questions_failed might need adjustment depending on desired reporting

    print(f"\n--- Summary ---")
    print(f"Questions created: {questions_created}")
    print(f"Questions failed/skipped: {questions_failed}")
    print("---------------")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate spelling questions from a YAML file.")
    parser.add_argument(
        "yaml_file",
        nargs='?',
        default=DEFAULT_YAML_PATH,
        help=f"Path to the input YAML file (default: {DEFAULT_YAML_PATH})"
    )
    args = parser.parse_args()

    # Ensure necessary libraries are installed
    try:
        import yaml
        import openai
        # Potentially check sqlalchemy if not implicitly checked by src.orm import
    except ImportError as e:
        print(f"Error: Missing required library. Please install PyYAML and openai.")
        print(f"Details: {e}")
        exit(1)

    main(args.yaml_file)