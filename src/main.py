from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
import uvicorn
import os
import string

from openai import OpenAI
import re

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema import AIMessage, HumanMessage
from typing import List, Dict
from urllib.parse import urlencode
import sqlite3
import logging
from dotenv import load_dotenv

logger = logging.getLogger(name=__file__)
logger.setLevel(logging.DEBUG)


# Initialize SQLite database
conn = sqlite3.connect("results.db")
cursor = conn.cursor()

# Create tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS question_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    correct TEXT,
    answer TEXT,
    last_edit INTEGER,
    score INTEGER
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS cumulative_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cumulative_score INTEGER
)
""")

conn.commit()

load_dotenv()

# Initialize the LLM
llm = ChatOpenAI(model="o1-mini-2024-09-12", temperature=1)

# Define the required words
required_words = {"example", "test", "response"}

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
        return f'<question-link>{keyword}</question-link>'
    
    # Create a regex pattern that matches any of the keywords
    pattern = r'\b(' + '|'.join(re.escape(keyword) for keyword in keywords) + r')\b'
    
    # Use re.sub to replace all occurrences of the pattern with the replacement function
    result_string = re.sub(pattern, replace_func, input_string)
    
    return result_string

oai_client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),  # This is the default and can be omitted
)
def get_openai_response(system, prompt):
    try:
        # Use the Completion endpoint to generate a response
        response = oai_client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {
                    "role": "system",
                    "content": system
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=1000,           # Adjust as needed for longer or shorter responses
            n=1,                       # Number of completions to generate
            stop=None,                 # Optional: specify a stopping sequence
            temperature=0.7            # Adjust the randomness of the output
        )
        
        # Extract the generated text from the response
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"An error occurred: {e}")
        return None

app = FastAPI()
trick_words = [
'Why',
'Sure',
'House',
'Together',
'Only',
'Move',
'Place',
'Right',
'Enough',
'Laugh',
]
genres = [
    'adventure',
    'super hero',
    'mystery',
    'comedy',
    'science fiction',
]
locations = [
    'under water',
    'wild west',
    'jungles of Africa',
    'Antartica',
    'Japanese Mountains',
]
styles = [
    'poem',
    'comic book',
    'Shakespeare',
    'Harry Potter',
]
QUESTIONS = [
    {
        "type": "input",
        "question": "spell: <play-word>Why</play-word>",
        "key": "spelling:why",
        "correct": "why"
    },
    {
        "type": "input",
        "question": "spell: <play-word>Sure</play-word>",
        "key": "spelling:sure",
        "correct": "sure"
    },
    {
        "type": "input",
        "question": "spell: <play-word>House</play-word>",
        "key": "spelling:house",
        "correct": "house"
    },
    {
        "type": "input",
        "question": "spell: <play-word>Together</play-word>",
        "key": "spelling:together",
        "correct": "together"
    },
    {
        "type": "input",
        "question": "spell: <play-word>Only</play-word>",
        "key": "spelling:only",
        "correct": "only"
    },
    {
        "type": "input",
        "question": "spell: <play-word>Move</play-word>",
        "key": "spelling:move",
        "correct": "move"
    },
    {
        "type": "input",
        "question": "spell: <play-word>Place</play-word>",
        "key": "spelling:place",
        "correct": "place"
    },
    {
        "type": "input",
        "question": "spell: <play-word>Right</play-word>",
        "key": "spelling:right",
        "correct": "right"
    },
    {
        "type": "input",
        "question": "spell: <play-word>Enough</play-word>",
        "key": "spelling:enough",
        "correct": "enough"
    },
]
# Define a Pydantic model for the incoming request data
class Answer(BaseModel):
    key: str
    value: str

class GradeRequest(BaseModel):
    answers: list[Answer]

class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope) -> FileResponse:
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


# SQLite database setup
def setup_database():
    conn = sqlite3.connect('story_cache.db')
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS stories (
                        cache_key TEXT PRIMARY KEY,
                        prompt TEXT,
                        story TEXT,
                        required_words TEXT
                      )''')
    conn.commit()
    conn.close()

setup_database()

def fetch_from_cache(cache_key):
    conn = sqlite3.connect('story_cache.db')
    cursor = conn.cursor()
    cursor.execute('SELECT prompt, story, required_words FROM stories WHERE cache_key = ?', (cache_key,))
    result = cursor.fetchone()
    conn.close()
    if result:
        return {
            "prompt": result[0],
            "story": result[1],
            "required_words": result[2]
        }
    return None

def save_to_cache(cache_key, prompt, story, required_words):
    conn = sqlite3.connect('story_cache.db')
    cursor = conn.cursor()
    cursor.execute('''INSERT OR REPLACE INTO stories (cache_key, prompt, story, required_words)
                      VALUES (?, ?, ?, ?)''', (cache_key, prompt, story, required_words))
    conn.commit()
    conn.close()

def generate_story(last_session_correct=None, force_new=False):
    """
    Generates a story using random questions and user preferences. Uses caching to avoid generating
    a new story unless explicitly requested via `force_new`.
    """
    # Use a unique cache key based on last session and preferences.
    cache_key = f"story_{last_session_correct}"

    if not force_new:
        cached_story = fetch_from_cache(cache_key)
        if cached_story:
            return cached_story

    # Select random questions and prepare required words
    question_list = random.sample(QUESTIONS, 4)
    word_to_question_map = {q["correct"]: q for q in question_list}
    required_words = [item['correct'] for item in question_list]

    # Build the user prompt
    user_prompt = f"""
    Write an {random.choice(genres)} story located in {random.choice(locations)} in the style of {random.choice(styles)} for my daughter Maeve who is 8 years old. It should be very silly. Over the top silly.
    She likes basketball and her best friend is Paige. 

    Make the story about 2 paragraphs long.

    Include these words in the story: {', '.join(required_words)}
    """

    if last_session_correct:
        print(f"questions: {last_session_correct}")
        print(f"correct: {last_session_correct}")

    # Generate and validate the story
    ordered_required_words, story = get_validated_response(user_prompt, required_words)

    # Save the generated story to the database
    save_to_cache(cache_key, user_prompt, story, ordered_required_words)

    return {
        "prompt": user_prompt,
        "story": story,
        "required_words": ordered_required_words
    }



# Mount static files directory (if you have any)
app.mount("/static", NoCacheStaticFiles(directory="static"), name="static")
app.mount("/node_modules", NoCacheStaticFiles(directory="node_modules"), name="node_modules")

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates")

@app.post("/submit")
async def submit_form(request: Request):
    form_data = await request.form()

    # Extract questions from the form data
    questions = []
    cumulative_score = 0
    page_load_time = int(form_data.get("pageLoadTime", 0))

    for key, value in form_data.items():
        if key.startswith("question") and key.endswith("_answer"):
            question_index = key.split("question")[1].split("_answer")[0]
            last_edit_key = f"question{question_index}_lastEdit"
            last_edit = int(form_data.get(last_edit_key, 0))

            # Determine the score for the question

            # Determine if the answer is correct
            is_correct = question_index == value
            if is_correct:
                cumulative_score += 1

            time_diff = last_edit - page_load_time
            if question_index != value:
                question_score = 0
            elif time_diff < 10000:
                question_score = 1
            elif 10000 <= time_diff < 20000:
                question_score = 2
            elif time_diff > 30000:
                question_score = 3
            else:
                question_score = 0

            question_data = {
                "correct": question_index,
                "answer": value,
                "last_edit": last_edit,
                "score": question_score
            }

            # Insert question data into the database
            try:
                cursor.execute(
                    """
                    INSERT INTO question_results (correct, answer, last_edit, score)
                    VALUES (?, ?, ?, ?)
                    """,
                    (question_index, value, last_edit, question_score)
                )
            except Exception as e:
                logger.error(e)

            questions.append(question_data)

    # Insert cumulative score into the database
    try:
        cursor.execute(
            """
            INSERT INTO cumulative_results (cumulative_score)
            VALUES (?)
            """,
            (cumulative_score,)
        )
    except Exception as e:
        logger.error(e)

    # Prepare URL parameters
    params = {
        "questions": len(questions),
        "correct": cumulative_score
    }
    print(params)
    url = f"/?{urlencode(params, doseq=True)}"

    return RedirectResponse(url=url, status_code=303)


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    last_session_questions = request.query_params.get('questions')
    last_session_correct = request.query_params.get('correct')
    question_list = random.sample(QUESTIONS, 4)
    word_to_question_map = {q["correct"]: q for q in question_list}
    required_words = [item['correct'] for item in question_list]
    user_prompt = f"""
    Write an {random.choice(genres)} story located in {random.choice(locations)} in the style of {random.choice(styles)} for my daughter Maeve who is 8 years old. It should be very silly. Over the top silly.
    She likes basketball and her best friend is Paige. 

    Make the story about 2 paragraphs long.

    Include these words in the story: {','.join(required_words)}
    """

    if last_session_correct:
        print(f'questions: {last_session_correct}')

    if last_session_correct:
        print(f'correct: {last_session_correct}')

    ordered_required_words, story = get_validated_response(user_prompt, required_words)

    # return a 400 error if there is no story response
    if story is None:
        raise HTTPException(status_code=400, detail="No valid story generated")
    
    final_question_order = [word_to_question_map[word] for word in ordered_required_words]

    return templates.TemplateResponse("classroom.html", {
        "request": request,
        "story": replace_keywords_with_links(story, ordered_required_words),
        "questions": final_question_order,
        "last_session_questions": last_session_questions,
        "last_session_correct": last_session_correct
    })

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)