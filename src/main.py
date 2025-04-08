from fastapi import FastAPI, Form, Request, HTTPException
from pydantic import BaseModel
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import random
import os
import markdown
import re
import logging
from typing import List, Dict, Tuple
from urllib.parse import urlencode
import sqlite3
from dotenv import load_dotenv

from openai import OpenAI
from pathlib import Path

from .orm import db_session
from . import assignments
from .stories import generate_story
from .utils import (
    get_validated_response,
    replace_keywords_with_links,
    generate_tts,
    gen_incorrect_answers,
    QUESTIONS,
    GENRES,
    LOCATIONS,
    STYLES,
    INTERESTS,
    FRIENDS,
    Question
)

logger = logging.getLogger(name=__file__)
logger.setLevel(logging.DEBUG)

load_dotenv()

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



# Mount static files directory (if you have any)
app.mount("/static", NoCacheStaticFiles(directory="static"), name="static")
app.mount("/media", NoCacheStaticFiles(directory="media"), name="media")

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Include routes from assignments.py
assignments.setup_routes(app)

@app.get("/classroom_page", response_class=HTMLResponse)
async def read_root(request: Request):
    last_session_questions = request.query_params.get('questions')
    last_session_correct = request.query_params.get('correct')
    question_list = random.sample(QUESTIONS, 4)
    word_to_question_map = {q.correct: q for q in question_list}
    required_words = [item.correct for item in question_list]
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


