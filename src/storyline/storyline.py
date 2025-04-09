import json
import random
import markdown
import logging
from typing import List, Dict, Tuple
from fastapi import APIRouter, Form, HTTPException, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import joinedload

from ..orm import SessionLocal, Storyline, StorylineStep, Story, Question, db_session, func
from ..progress import StorylineProgress
from ..utils import (
    GENRES,
    LOCATIONS,
    STYLES,
    INTERESTS,
    FRIENDS,
    QuestionViewModel # Assuming QuestionViewModel might be needed by get_storyline_step_details
)

logger = logging.getLogger(name=__file__)
logger.setLevel(logging.DEBUG)

# Initialize Jinja2 templates - Consider defining this centrally and importing/passing
templates = Jinja2Templates(directory="src/storyline/templates")

router = APIRouter()

# === Helper Functions Moved from assignments.py ===

def get_all_storylines() -> List[Dict]:
    """
    Return all storylines from the database with their status
    """
    with db_session() as session:
        storylines = session.query(Storyline).all()

        # Convert Storyline objects to dictionaries
        storyline_list = []
        for storyline in storylines:
            storyline_dict = {
                "storyline_id": storyline.storyline_id,
                "original_request": storyline.original_request,
                "status": storyline.status,
                "step_count": len(storyline.steps) if storyline.steps else 0
            }
            storyline_list.append(storyline_dict)

    return storyline_list

def get_storyline_step_details(storyline_step_id: int) -> Tuple[int, str, List[QuestionViewModel]]: # Added int for story_id
    """
    Fetch the story ID, story content, and associated questions for a specific storyline step.
    """
    with db_session() as session:
        # Fetch the StorylineStep, joining the related Story and its Questions
        storyline_step = (
            session.query(StorylineStep)
            .options(
                joinedload(StorylineStep.story).joinedload(Story.questions)
            )
            .filter(StorylineStep.storyline_step_id == storyline_step_id)
            .one_or_none()
        )

        if not storyline_step or not storyline_step.story:
            raise HTTPException(status_code=404, detail=f"Storyline step {storyline_step_id} or its story not found.")

        story_id = storyline_step.story.id # Get the story ID

        story_content = storyline_step.story.content
        questions = storyline_step.story.questions

        # Convert Question ORM objects to QuestionViewModel
        question_list = [
            QuestionViewModel(
                type=q.type,
                question=q.question,
                key=q.key,
                correct=q.correct,
                answers=(q.answers or '').split(',') if q.answers else [] # Ensure answers is a list
            ) for q in questions
        ]

    return story_id, story_content, question_list


# === Routes Moved from assignments.py ===

@router.get("/storylines", response_class=HTMLResponse)
async def storyline_dashboard(request: Request):
    """
        View the Storyline Dashboard
    """
    storylines = get_all_storylines()
    return templates.TemplateResponse("storylines.html", {
        "request": request,
        "storylines": storylines
    })

@router.post("/storylines")
async def create_storyline(
    trick_words: list[str] = Form([]),
    genres = Form(None),
    locations = Form(None),
    styles = Form(None),
    interests: list[str] = Form([]),
    gen_ttl: bool = Form(True), # Assuming gen_ttl was meant to be used somewhere, keeping it for now
    friends: list[str] = Form([])
):
    """
        Create a new Storyline
    """
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

    # Create JSON data package
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

    storyline_data = {
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
            original_request=json.dumps(storyline_data),
            status="pending"
        )
        db.add(storyline)
        db.commit()
        db.refresh(storyline) # Refresh to get the generated ID if needed later
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

    # Redirect to the storyline dashboard after creation
    return RedirectResponse(url="/storylines", status_code=303) # Use router.url_path_for('storyline_dashboard') ideally

@router.get("/storylines/create", response_class=HTMLResponse)
async def storyline_form(request: Request):
    """
        Create Storylines Form
    """
    return templates.TemplateResponse("create_storyline.html", {
        "request": request,
        # Pass necessary variables if the template requires them (e.g., GENRES, LOCATIONS)
        "genres": GENRES,
        "locations": LOCATIONS,
        "styles": STYLES,
        "interests": INTERESTS,
        "friends": FRIENDS
    })

@router.get("/storyline/{storyline_id}/page/{storyline_step_id}", response_class=HTMLResponse)
async def view_storyline_step(request: Request, storyline_id: int, storyline_step_id: int):
    """
    Display a specific step (page) within a storyline, including its story and questions.
    Fetches and includes the latest progress for each story within the storyline.
    """
    # Fetch the latest progress for each story in this storyline
    storyline_progress = StorylineProgress(storyline_id=storyline_id)

    try:
        # Unpack story_id, story_content, questions
        story_id, story_content, questions = get_storyline_step_details(storyline_step_id)
    except HTTPException as e:
        # Re-raise HTTPExceptions directly
        raise e
    except Exception as e:
         logger.error(f"Error fetching storyline step details for step {storyline_step_id}: {e}")
         raise HTTPException(status_code=500, detail="Internal server error fetching storyline step.")

    return templates.TemplateResponse('classroom.html', {
        "request": request,
        "storyline_id": storyline_id,
        "storyline_step_id": storyline_step_id,
        "story_id": story_id, # Pass story_id to the template
        "story": markdown.markdown(story_content),
        "questions": questions,
        "storyline_progress": storyline_progress # Pass the fetched progress
    })