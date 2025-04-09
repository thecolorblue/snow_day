from fastapi import FastAPI, Form, HTTPException, Request
from fastapi.responses import RedirectResponse, HTMLResponse # Keep RedirectResponse for /assignments POST
from fastapi.templating import Jinja2Templates
import logging
import json # Keep json for /assignments POST
from typing import List, Dict, Tuple
from .orm import db_session # Removed unused ORM models
# Removed unused imports: random, re, markdown, SessionLocal, Storyline, StorylineStep, Story, Question, func, joinedload, StorylineProgress
from .utils import (
    get_validated_response, # Assuming this might be used by create_assignment or submit_form indirectly
    replace_keywords_with_links, # Assuming this might be used by create_assignment or submit_form indirectly
    generate_tts, # Assuming this might be used by create_assignment or submit_form indirectly
    QUESTIONS, # Assuming this might be used by create_assignment or submit_form indirectly
    # Removed unused constants: GENRES, LOCATIONS, STYLES, INTERESTS, FRIENDS
    QuestionViewModel
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


# Removed get_all_storylines function (moved to storyline.py)
def get_all_questions() -> List[Dict]:
    """
    Return all questions from the database
    """
    with db_session() as session:
        # Query all questions and join with story through the association table
        query = """
        SELECT q.id, q.type, q.question, q.key, q.correct, q.answers, s.id as story_id, s.content as story_content
        FROM questions q
        JOIN story_question sq ON q.id = sq.question_id
        JOIN story s ON sq.story_id = s.id
        """
        
        session.execute(query)
        
        # Fetch all rows from the result set
        rows = session.fetchall()
        
        columns = [description[0] for description in session.description]
        
        # Convert each row into a dictionary
        questions = [dict(zip(columns, row)) for row in rows]
        
    return questions



def save_assignment(story: str, questions: List[QuestionViewModel]):
    """
    Save story and questions to the SQLite database.
    
    :param story: The story content as a string.
    :param questions: A list of QuestionViewModel objects.
    """
    with db_session() as session:

        # Insert the story
        session.execute('INSERT INTO story (content) VALUES (%s) RETURNING id', (story,))
        story_id = session.fetchone()[0]

        # Insert questions into the questions table (without story_id)
        for question in questions:
            # Insert the question
            session.execute('''
                INSERT INTO questions (type, question, key, correct, answers)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            ''', (question.type, question.question, question.key, question.correct, ','.join(question.answers or [])))
            
            question_id = session.fetchone()[0]
            
            # Create the association in the story_question table
            session.execute('''
                INSERT INTO story_question (story_id, question_id)
                VALUES (%s, %s)
            ''', (story_id, question_id))

    return {
        "story_id": story_id,
    }


def get_assignment(story_id: int) -> Tuple[str, List[QuestionViewModel]]:
    with db_session() as session:

        # Fetch the story content
        session.execute("SELECT content FROM story WHERE id = %s", (story_id,))
        story_content = session.fetchone()
        
        if story_content is None:
            raise ValueError(f"No story found for ID: {story_id}")
        
        story_content = story_content[0]
        
        # Fetch all questions associated with the story through the association table
        session.execute("""
            SELECT q.type, q.question, q.key, q.correct, q.answers
            FROM questions q
            JOIN story_question sq ON q.id = sq.question_id
            WHERE sq.story_id = %s
        """, (story_id,))
        questions = session.fetchall()

        # Convert each fetched question into a Question object
        question_list = [QuestionViewModel(type=q[0], question=q[1], key=q[2], correct=q[3], answers=(q[4] or '').split(',')) for q in questions]
        
    return story_content, question_list
# Removed get_storyline_step_details function (moved to storyline.py)



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
                story_id, story_content, questions = get_storyline_step_details(storyline_step_id) # Unpack story_id
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


    # Removed GET /storyline/{storyline_id}/page/{storyline_step_id} route (moved to storyline.py)
    @app.get("/assignments", response_class=HTMLResponse)
    async def assignment_dashboard(request: Request):
        """
            View the Assignment Dashboard
        """
        assignments = get_student_assignments()

        return templates.TemplateResponse("assignments.html", {
            "request": request,
            "assignments": assignments
        })

    @app.get("/questions", response_class=HTMLResponse)
    async def questions_dashboard(request: Request):
        """
            View the Questions Dashboard
        """
        questions = get_all_questions()

        return templates.TemplateResponse("questions.html", {
            "request": request,
            "questions": questions
        })

    # Removed GET /storyline/{storyline_id}/page/{storyline_step_id} route (moved to storyline.py)
    # Removed GET /storylines route (moved to storyline.py)
    # Removed POST /storylines route (moved to storyline.py)
    # Removed GET /storylines/create route (moved to storyline.py)
# Removed leftover lines

    # Removed GET /storylines route (moved to storyline.py)
    # Removed POST /storylines route (moved to storyline.py)
    # Removed GET /storylines/create route (moved to storyline.py)



    @app.get("/assignment/create", response_class=HTMLResponse)
    async def assignment_form(request: Request):
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
        # Select random questions from the database if trick_words is empty
        if trick_words:
            question_list = trick_words
        else:
            db = SessionLocal()
            try:
                # Query 6 random questions from the database
                db_questions = db.query(Question).order_by(func.random()).limit(6).all()
                question_list = db_questions
            except Exception as e:
                db.close()
                raise HTTPException(status_code=500, detail=f"Error fetching questions: {str(e)}")
            finally:
                db.close()
        
        # Convert Question objects to serializable format if needed
        serialized_questions = []
        if trick_words:
            # If trick_words is provided, use it directly
            serialized_questions = question_list
        else:
            # Convert SQLAlchemy Question objects to serializable format
            for q in question_list:
                serialized_questions.append({
                    "id": q.id,
                    "type": q.type,
                    "question": q.question,
                    "key": q.key,
                    "correct": q.correct,
                    "answers": q.answers.split(',') if q.answers else None
                })
        
        # Create JSON data package
        assignment_data = {
            "question_list": serialized_questions,
            "genre": genres or random.choice(GENRES),
            "location": locations or random.choice(LOCATIONS),
            "style": styles or random.choice(STYLES),
            "selected_interests": interests if interests else random.sample(INTERESTS, 2),
            "friend": random.choice(friends or FRIENDS)
        }
        # Create new Storyline record
        db = SessionLocal()
        try:
            storyline = Storyline(
                original_request=json.dumps(assignment_data),
                status="pending"
            )
            db.add(storyline)
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
        
        return RedirectResponse(url="/assignments/", status_code=303)