import random
import os
import string
import requests
import re
import logging
from typing import List, Dict, Tuple, Set

from langchain_openai import ChatOpenAI
from langchain.schema import AIMessage, HumanMessage

from .orm import db_session

logger = logging.getLogger(name=__file__)
logger.setLevel(logging.DEBUG)

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

def generate_tts(audio_text, output_filename, output_dir="./media"):
    # Set up your API key and endpoint
    api_key = os.getenv("OPENAI_API_KEY")  # Pull the API key from the environment variable
    if not api_key:
        raise ValueError("API key not found. Please set the OPENAI_API_KEY environment variable.")

    endpoint = "https://api.openai.com/v1/audio/speech"

    # Define the headers and data payload
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "tts-1",
        "input": audio_text,
        "voice" : "sage"
    }

    try:
        print(headers)
        # Make the POST request to the TTS endpoint
        response = requests.post(endpoint, json=data, headers=headers)
        response.raise_for_status()

        # Save the response content as an MP3 file
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, output_filename)
        
        with open(output_path, "wb") as audio_file:
            audio_file.write(response.content)

        print(f"Audio saved successfully at: {output_path}")

    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")

# Function to check if all required words are in the response
def check_response(response: str, required_words: set) -> bool:
    return all(word in response for word in required_words)

def extract_ordered_required_words(response, required_words):
    # Convert response to lowercase
    response_lower = response.lower()
    
    # Remove punctuation using str.translate and str.maketrans
    translator = str.maketrans('', '', string.punctuation)
    cleaned_response = response_lower.translate(translator)
    
    # Split the cleaned response into words
    words = cleaned_response.split()
    
    # Use a set to track seen words and maintain order with a list comprehension
    seen = set()
    ordered_required_words = [word for word in words if word in required_words and not (word in seen or seen.add(word))]
    
    return ordered_required_words


def append_string_randomly(data_list, string_to_append):
    """Appends a string at a random index within a list.

    Args:
        data_list: The list to modify.
        string_to_append: The string to insert.
    """
    if not data_list:
      data_list.append(string_to_append)
      return
    random_index = random.randint(0, len(data_list))
    data_list.insert(random_index, string_to_append)
    
    return data_list


def gen_incorrect_answers(word: str)-> List[str]:
    prompt = f"""
Take a word and return 3 incorrect spellings of that word. Make one completely wrong and two close but incorrect.

Only reply with a list of three words seperated by commas.

Here is the word: {word}
    """
    text_response = llm([HumanMessage(content=prompt)]).content
    response = text_response.split(',')
    list = append_string_randomly(response, word)

    return list


# Main function to generate and validate LLM responses
def get_validated_response(prompt: str, required_words: set, max_attempts: int = 5):
    original_prompt = prompt  # Store the original prompt
    attempts = 0
    while attempts < max_attempts:
        # Get response from LLM
        response = llm([HumanMessage(content=prompt)]).content
        print(f"Attempt {attempts + 1}")
        
        # Check if the response includes all required words
        if check_response(response, required_words):
            
            # Extract required words in the order they appear in the response
            ordered_required_words = extract_ordered_required_words(response, required_words)
            
            # Return both the ordered list of required words and the response
            return ordered_required_words, response
        
        # If not, inform the LLM and try again with the original prompt and new instructions
        prompt = (
            f"{original_prompt}\n"
            f"The previous response did not include all the required words: "
            f"{', '.join(required_words)}. Please try again."
        )
        attempts += 1

    print("Failed to generate a response with all required words after maximum attempts.")
    return None, None

def replace_keywords_with_links(input_string, keywords):
    # Define a function to be used as the replacement function in re.sub
    def replace_func(match):
        keyword = match.group(0)
        return f'<play-word>{keyword}</play-word>'
    
    # Create a regex pattern that matches any of the keywords
    pattern = r'\b(' + '|'.join(re.escape(keyword) for keyword in keywords) + r')\b'
    
    # Use re.sub to replace all occurrences of the pattern with the replacement function
    result_string = re.sub(pattern, replace_func, input_string)
    
    return result_string

# Constants
TRICK_WORDS = [
    'eight',
    'large',
    'night',
    'answer',
    'different',
    'world',
    'continent',
    'ocean',
    'country',
]

GENRES = [
    'adventure',
    'super hero',
    'mystery',
    'comedy',
    'science fiction',
]

LOCATIONS = [
    'under water',
    'wild west',
    'jungles of Africa',
    'Antartica',
    'Japanese Mountains',
]

STYLES = [
    'poem',
    'comic book',
    'Shakespeare',
    'Harry Potter',
]

INTERESTS = [
    'basketball',
    'acting',
    'directing plays',
    'American Girl dolls',
    'skateboarding',
    'ice skating',
    'Mario Kart',
    'Zelda',
]

FRIENDS = [
    'Paige',
    'Maia',
    'Zadie',
    'Zoe',
]

class Question:
    type: str
    question: str
    key: str
    correct: str
    answers: List[str]

    def __init__(self, type: str, question: str, key: str, correct: str, answers: List[str] = None):
        self.type = type
        self.question = question
        self.key = key
        self.correct = correct
        self.answers = answers

QUESTIONS: List[Question] = [
    Question(
        type="input",
        question=f"spell: <play-word>{word}</play-word>",
        key=f"spelling:{word}",
        correct=word
    ) for word in TRICK_WORDS
]