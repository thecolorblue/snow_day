from fastapi import FastAPI, Form, Request
from fastapi.responses import RedirectResponse
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import random
import re
import markdown
import logging
from typing import List, Dict, Tuple

from .orm import db_session
from .utils import (
    get_validated_response,
    replace_keywords_with_links,
    generate_tts,
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

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates")


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
    left JOIN results r ON s.id = r.story_id;
    """

    with db_session() as session:
        session.execute(query)

        # Fetch all rows from the result set
        rows = session.fetchall()

        columns = [description[0] for description in session.description]

    # Convert each row into a dictionary
    assignments = [dict(zip(columns, row)) for row in rows]

    return assignments


def save_assignment(story: str, questions: List[Question]):
    """
    Save story and questions to the SQLite database.
    
    :param story: The story content as a string.
    :param questions: A list of Question objects.
    """
    with db_session() as session:

        session.execute('INSERT INTO story (content) VALUES (%s) RETURNING id', (story,))
        story_id = session.fetchone()[0]

        # Insert questions into the questions table, linking them to the story by story_id
        for question in questions:
            session.execute('''
                INSERT INTO questions (story_id, type, question, key, correct, answers)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (story_id, question.type, question.question, question.key, question.correct, ','.join(question.answers or [])))
            

    return {
        "story_id": story_id,
    }


def get_assignment(story_id: int) -> Tuple[str, List[Question]]:
    with db_session() as session:

        # Fetch the story content
        session.execute("SELECT content FROM story WHERE id = %s", (story_id,))
        story_content = session.fetchone()
        
        if story_content is None:
            raise ValueError(f"No story found for ID: {story_id}")
        
        story_content = story_content[0]
        
        # Fetch all questions associated with the story
        session.execute("SELECT type, question, key, correct, answers FROM questions WHERE story_id = %s", (story_id,))
        questions = session.fetchall()

        # Convert each fetched question into a Question object
        question_list = [Question(type=q[0], question=q[1], key=q[2], correct=q[3], answers=(q[4] or '').split(',')) for q in questions]
        
    return story_content, question_list


def setup_routes(app: FastAPI):
    @app.post("/assignments/{story_id}/submit")
    async def submit_form(request: Request, story_id: int):
        form_data = await request.form()

        form_dict = {key: value for key, value in form_data.items()}

        # Create a set to collect unique question numbers dynamically
        question_numbers = set()
        last_answer = 0

        # Use a regular expression to find all question numbers from keys
        for key in form_dict.keys():
            match = re.match(r'question(.+)_answer', key)
            if match:
                question_numbers.add(int(match.group(1)))

        # Sort the question numbers to maintain order
        question_numbers = sorted(question_numbers)

        # Create the questions array
        questions = []


        with db_session() as session:

            # Collect the answer and lastEdit pairs for each question
            for num in question_numbers:
                answer_key = f'question{num}_answer'
                last_edit_key = f'question{num}_lastEdit'
                last_edit_time = int(form_dict[last_edit_key])
                if last_edit_time > last_answer:
                    last_answer = last_edit_time

                if answer_key in form_dict and last_edit_key in form_dict:

                    session.execute(
                        """
                        INSERT INTO question_results (correct, answer, last_edit, score)
                        VALUES (%s, %s, %s, %s)
                        """,
                        (f"{story_id}", form_dict[answer_key], form_dict[last_edit_key], int(form_dict[last_edit_key]) - int(form_dict['paLoadTime']))
                    )
                    questions.append({
                        'answer': form_dict[answer_key],
                        'lastEdit': form_dict[last_edit_key]
                    })

            # # Insert cumulative score into the database
            try:
                session.execute(
                    """
                    INSERT INTO results (score, story_id)
                    VALUES (%s, %s)
                    """,
                    (last_answer - int(form_dict['pageLoadTime']),story_id)
                )
                session.commit()
            except Exception as e:
                logger.error(e)

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
        genres = Form(None),
        locations = Form(None),
        styles = Form(None),
        interests: list[str] = Form([]),
        gen_ttl: bool = Form(True),
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
        if gen_ttl:
            generate_tts(raw_text, f"assignment-{story_dict['story_id']}.mp3")

        return RedirectResponse(url="/assignments/", status_code=303)