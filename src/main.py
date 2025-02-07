from fastapi import FastAPI, Form, Request, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
import uvicorn
import os
import string
import requests
import markdown

from openai import OpenAI
import re

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.schema import AIMessage, HumanMessage
from typing import List, Dict, Tuple
from urllib.parse import urlencode
import sqlite3
import logging
from dotenv import load_dotenv

from pathlib import Path
from openai import OpenAI
import psycopg2

logger = logging.getLogger(name=__file__)
logger.setLevel(logging.DEBUG)


# Get the DATABASE_URL from environment variables
database_url = os.getenv('DATABASE_URL')

if database_url:
    # Connect to PostgreSQL
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor()
else:
    # Connect to SQLite
    conn = sqlite3.connect("results.db")
    cursor = conn.cursor()

# Create tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS question_results (
    id SERIAL PRIMARY KEY,
    correct TEXT,
    answer TEXT,
    last_edit INTEGER,
    score INTEGER
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL,
    score INTEGER
)
""")
    
# Create tables if they don't exist
cursor.execute('''
    CREATE TABLE IF NOT EXISTS story (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL
    )
''')

cursor.execute('''
    CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        story_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        question TEXT NOT NULL,
        key TEXT NOT NULL,
        correct TEXT NOT NULL,
        answers TEXT,
        FOREIGN KEY (story_id) REFERENCES story (id)
    )
''')

conn.commit()

load_dotenv()

# Initialize the LLM
llm = ChatOpenAI(model="gpt-4o-mini", temperature=1)


def generate_tts(audio_text, output_filename, output_dir="./media"):
    # Set up your API key and endpoint
    api_key = os.getenv("OPENAI_API_KEY")  # Pull the API key from the environment variable
    if not api_key:
        raise ValueError("API key not found. Please set the OPENAI_API_KEY environment variable.")

    endpoint = "https://api.openai.com/v1/audio/speech"

    # Define the headers and data payload
    headers = {
        "Authorization": f"Bearer {api_key}"
    }

    data = {
        "model": "tts-1",
        "input": audio_text,
        "voice" : "sage"
    }

    try:
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


def gen_incorrect_answers(word_list: List[str])-> List[List[str]]:
    responses = []
    
    for word in word_list:
        prompt = f"""
Take a word and return 3 incorrect spellings of that word. Make one completely wrong and two close but incorrect.

Only reply with a list of three words seperated by commas.

Here is the word: {word}
        """
        text_response = llm([HumanMessage(content=prompt)]).content
        response = text_response.split(',')
        list = append_string_randomly(response, word)
        responses.append(list)

    return responses


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
TRICK_WORDS = [
# 'Why',
# 'Sure',
# 'House',
# 'Together',
# 'Only',
# 'Move',
# 'Place',
# 'Right',
# 'Enough',
# 'Laugh',

# 'try',
# 'laugh',
# 'eight',
# 'city',
# 'night',
# 'carry',
# 'something',
# 'change',
# 'family',
# 'every',

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

    ordered_required_words, raw_text = get_validated_response(user_prompt, required_words)

    if ordered_required_words == None:
        return

    story = replace_keywords_with_links(raw_text, ordered_required_words)
    questions = [word_to_question_map[word] for word in ordered_required_words]

    story_dict = save_assignment(story, questions)

    generate_tts(raw_text, f'assignment-{story_dict["story_id"]}.mp3')


def get_student_assignments() -> List[Dict]:
    """
        return all stories without results
        Use this query:
        SELECT s.*
        FROM story s
        LEFT JOIN results r ON s.id = r.story_id
        WHERE r.id IS NULL;
    """


    # Execute the SQL query
    query = """
    SELECT s.id as story_id, s.content as content, r.score as score
    FROM story s
    left JOIN results r ON s.id = r.story_id

    """
    cursor.execute(query)

    # Fetch all rows from the result set
    rows = cursor.fetchall()

    # Get column names from the cursor description
    columns = [description[0] for description in cursor.description]

    # Convert each row into a dictionary
    assignments = [dict(zip(columns, row)) for row in rows]

    return assignments



def save_assignment(story: str, questions: List[Question]):
    """
    Save story and questions to the SQLite database.
    
    :param story: The story content as a string.
    :param questions: A list of Question objects.
    """
    # Connect to the SQLite database
    cursor = conn.cursor()
    
    # Insert the story into the story table
    cursor.execute('INSERT INTO story (content) VALUES (%s)', (story,))
    story_id = cursor.lastrowid  # Get the ID of the newly inserted story
    
    # Insert questions into the questions table, linking them to the story by story_id
    for question in questions:
        cursor.execute('''
            INSERT INTO questions (story_id, type, question, key, correct)
            VALUES (%s, %s, %s, %s, %s)
        ''', (story_id, question.type, question.question, question.key, question.correct))
    
    # Commit changes and close the connection
    conn.commit()

    return {
        "story_id": story_id,
    }


def get_assignment(story_id: int) -> Tuple[str, List[Question]]:
    cursor = conn.cursor()

    # Fetch the story content
    cursor.execute("SELECT content FROM story WHERE id = %s", (story_id,))
    story_content = cursor.fetchone()
    
    if story_content is None:
        raise ValueError(f"No story found for ID: {story_id}")
    
    story_content = story_content[0]
    
    # Fetch all questions associated with the story
    cursor.execute("SELECT type, question, key, correct FROM questions WHERE story_id = %s", (story_id,))
    questions = cursor.fetchall()
    
    # Convert each fetched question into a Question object (assuming you have a Question class defined)
    question_list = [Question(type=q[0], question=q[1], key=q[2], correct=q[3]) for q in questions]
        
    return story_content, question_list


# Mount static files directory (if you have any)
app.mount("/static", NoCacheStaticFiles(directory="static"), name="static")
app.mount("/media", NoCacheStaticFiles(directory="media"), name="media")

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates")


@app.post("/assignments/{story_id}/submit")
async def submit_form(request: Request, story_id: int):
    form_data = await request.form()

    form_dict = {key: value for key, value in form_data.items()}

    # Create a set to collect unique question numbers dynamically
    question_numbers = set()
    last_answer = 0

    # Use a regular expression to find all question numbers from keys
    for key in form_dict.keys():
        match = re.match(r'question(\d+)_answer', key)
        if match:
            question_numbers.add(int(match.group(1)))

    # Sort the question numbers to maintain order
    question_numbers = sorted(question_numbers)

    # Create the questions array
    questions = []

    # Collect the answer and lastEdit pairs for each question
    for num in question_numbers:
        answer_key = f'question{num}_answer'
        last_edit_key = f'question{num}_lastEdit'
        last_edit_time = int(form_dict[last_edit_key])
        if last_edit_time > last_answer:
            last_answer = last_edit_time
        
        if answer_key in form_dict and last_edit_key in form_dict:

            cursor.execute(
                """
                INSERT INTO question_results (correct, answer, last_edit, score)
                VALUES (%s, %s, %s, %s)
                """,
                (f"{story_id}", form_dict[answer_key], form_dict[last_edit_key], int(form_dict[last_edit_key]) - int(form_dict['pageLoadTime']))
            )
            questions.append({
                'answer': form_dict[answer_key],
                'lastEdit': form_dict[last_edit_key]
            })

    conn.commit()

    # Print the questions array
    print(form_dict['pageLoadTime'])
    print(last_answer)
    print(last_answer - int(form_dict['pageLoadTime']),story_id)
    print(questions)
    # Extract questions from the form data
    # questions = []
    # score = 0
    # story_id = 0
    # page_load_time = int(form_data.get("pageLoadTime", 0))

    # for key, value in form_data.items():
    #     if key == 'story_id':
    #         story_id = value
    #     if key.startswith("question") and key.endswith("_answer"):
    #         question_index = key.split("question")[1].split("_answer")[0]
    #         last_edit_key = f"question{question_index}_lastEdit"
    #         last_edit = int(form_data.get(last_edit_key, 0))

    #         # Determine the score for the question

    #         # Determine if the answer is correct
    #         is_correct = question_index == value
    #         if is_correct:
    #             score += 1

    #         time_diff = last_edit - page_load_time
    #         if question_index != value:
    #             question_score = 0
    #         elif time_diff < 10000:
    #             question_score = 1
    #         elif 10000 <= time_diff < 20000:
    #             question_score = 2
    #         elif time_diff > 30000:
    #             question_score = 3
    #         else:
    #             question_score = 0

    #         question_data = {
    #             "correct": question_index,
    #             "answer": value,
    #             "last_edit": last_edit,
    #             "score": question_score
    #         }

    #         # Insert question data into the database
    #         try:
    #             cursor.execute(
    #                 """
    #                 INSERT INTO question_results (correct, answer, last_edit, score)
    #                 VALUES (?, ?, ?, ?)
    #                 """,
    #                 (question_index, value, last_edit, question_score)
    #             )
    #         except Exception as e:
    #             logger.error(e)

    #         questions.append(question_data)

    # # Insert cumulative score into the database
    try:
        cursor.execute(
            """
            INSERT INTO results (score, story_id)
            VALUES (%s, %s)
            """,
            (last_answer - int(form_dict['pageLoadTime']),story_id)
        )
        conn.commit()
    except Exception as e:
        logger.error(e)

    # # Prepare URL parameters
    # params = {
    #     "questions": len(questions),
    #     "correct": score
    # }
    # print(params)
    # url = f"/assignments/{str(id + 1)}?{urlencode(params, doseq=True)}"

    return RedirectResponse(url='/assignments/', status_code=303)


@app.get("/assignments/{id}", response_class=HTMLResponse)
async def start_assignment(request: Request, id: str):
    """
        Start an assignment in the database
    """
    last_session_questions = request.query_params.get('questions')
    last_session_correct = request.query_params.get('correct')

    story, questions = get_assignment(id)

    return templates.TemplateResponse('classroom.html', {
        "request": request,
        "story_id": id,
        "story": markdown.markdown(story),
        "questions": questions,
        "last_session_questions": last_session_questions,
        "last_session_correct": last_session_correct
    })


@app.get("/assignments", response_class=HTMLResponse)
async def assignment_dashboard(request: Request):
    """
        View the Assignement Dashboard
    """

    assignments = get_student_assignments()

    return templates.TemplateResponse("assignments.html", {
        "request": request,
        "assignments": assignments
    })


@app.get("/assignment/create", response_class=HTMLResponse)
async def assignment_dashboard(request: Request):
    """
        Create Assignments
    """

    return templates.TemplateResponse("create_assignment.html", {
        "request": request
    })
                                      

@app.post("/assignments")
async def create_assignment(
    trick_words: list[str] = Form([]),
    genres: str | None = Form(None),
    locations: str | None = Form(None),
    styles: str | None = Form(None),
    interests: list[str] = Form([]),
    friends: list[str] = Form([])
):
    # Select random questions and words
    question_list = trick_words or random.sample(QUESTIONS, 6)
    word_to_question_map = {q.correct: q for q in question_list}
    required_words = [item.correct for item in question_list]

    genre = genres or random.choice(GENRES)
    location = locations or random.choice(LOCATIONS)
    style = styles or random.choice(STYLES)
    selected_interests = interests if interests else random.sample(INTERESTS, 2)
    friend = random.choice(friends or FRIENDS)

    # Build user prompt with all interests dynamically
    interests_text = ', '.join(selected_interests)

    user_prompt = f"""
    Write an {genre} story located in {location} in the style of {style} for Maeve who is 8 years old. It should be very silly. Over the top silly.
    She likes {interests_text}, and her best friend is {friend}.

    Make the story about 2 paragraphs long.

    Include these words in the story: {', '.join(required_words)}
    """

    # Generate and validate the story
    ordered_required_words, raw_text = get_validated_response(user_prompt, required_words)

    if ordered_required_words is None:
        return {"error": "Failed to generate a story with valid words."}

    # Replace keywords and save the story
    story = replace_keywords_with_links(raw_text, ordered_required_words)
    questions = [word_to_question_map[word] for word in ordered_required_words]
    story_dict = save_assignment(story, questions)

    # Generate text-to-speech (TTS)
    generate_tts(raw_text, f"assignment-{story_dict['story_id']}.mp3")

    return {"message": "Story created successfully", "story_id": story_dict["story_id"]}

    return RedirectResponse(url="/assignments/", status_code=303)


@app.get("/classroom_page", response_class=HTMLResponse)
async def read_root(request: Request):
    last_session_questions = request.query_params.get('questions')
    last_session_correct = request.query_params.get('correct')
    question_list = random.sample(QUESTIONS, 4)
    word_to_question_map = {q["correct"]: q for q in question_list}
    required_words = [item['correct'] for item in question_list]
    user_prompt = f"""
    Write an {random.choice(GENRES)} story located in {random.choice(LOCATIONS)} in the style of {random.choice(STYLES)} for my daughter Maeve who is 8 years old. It should be very silly. Over the top silly.
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


@app.get("/")
def health_check(request: Request):
    return { "status": "up" }


