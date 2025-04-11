import datetime
import statistics
from collections import Counter
from typing import Dict, List, Optional, Tuple, Any

from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from src.orm import (
    StorylineProgress, 
    Storyline, 
    StorylineStep, 
    StoryQuestion, 
    Story, 
    Question,
    db_session
)


def StorylineProgress(storyline_id: int) -> Dict[int, List[Dict[str, Any]]]:
    """
    Get all StorylineProgress rows for a given storyline_id, grouped by the story_id 
    they are associated with. Limit the number of progress rows returned per story to 1.
    
    Args:
        storyline_id: The ID of the storyline to get progress for
        
    Returns:
        A dictionary mapping story_id to a list of progress dictionaries
    """
    with db_session() as session:
        # Query to get the latest progress entry for each story in the storyline
        progress_entries = (
            session.query(StorylineProgress)
            .join(StoryQuestion, StorylineProgress.story_question_id == StoryQuestion.id)
            .join(StorylineStep, StorylineStep.storyline_id == storyline_id)
            .filter(StorylineProgress.storyline_id == storyline_id)
            .order_by(StoryQuestion.story_id, desc(StorylineProgress.created_at))
            .all()
        )
        
        # Group by story_id and take the first (most recent) entry for each
        result = {}
        story_seen = set()
        
        for entry in progress_entries:
            story_id = entry.story_question.story_id
            
            if story_id not in story_seen:
                story_seen.add(story_id)
                
                if story_id not in result:
                    result[story_id] = []
                
                # Convert the entry to a dictionary
                progress_dict = {
                    "storyline_progress_id": entry.storyline_progress_id,
                    "story_question_id": entry.story_question_id,
                    "duration": entry.duration,
                    "score": entry.score,
                    "attempts": entry.attempts,
                    "created_at": entry.created_at,
                    "question_id": entry.story_question.question_id,
                }
                
                result[story_id].append(progress_dict)
        
        return result


def QuestionProgress(question_id: int) -> Dict[str, Any]:
    """
    Get all StorylineProgress rows for a given question id and calculate 
    the mean score and data distribution.
    
    Args:
        question_id: The ID of the question to get progress for
        
    Returns:
        A dictionary containing statistics about the question progress
    """
    with db_session() as session:
        # Query all progress entries for the given question
        progress_entries = (
            session.query(StorylineProgress)
            .join(StoryQuestion, StorylineProgress.story_question_id == StoryQuestion.id)
            .filter(StoryQuestion.question_id == question_id)
            .all()
        )
        
        # Extract scores and calculate statistics
        scores = [entry.score for entry in progress_entries if entry.score is not None]
        durations = [entry.duration for entry in progress_entries if entry.duration is not None]
        attempts = [entry.attempts for entry in progress_entries if entry.attempts is not None]
        
        # Calculate statistics
        result = {
            "question_id": question_id,
            "total_attempts": len(progress_entries),
            "score_stats": {
                "mean": statistics.mean(scores) if scores else None,
                "median": statistics.median(scores) if scores else None,
                "distribution": dict(Counter(scores)) if scores else {},
            },
            "duration_stats": {
                "mean": statistics.mean(durations) if durations else None,
                "median": statistics.median(durations) if durations else None,
            },
            "attempts_stats": {
                "mean": statistics.mean(attempts) if attempts else None,
                "median": statistics.median(attempts) if attempts else None,
                "distribution": dict(Counter(attempts)) if attempts else {},
            },
        }
        
        return result


def StoryProgress(story_id: int) -> List[Dict[str, Any]]:
    """
    Get all the StorylineProgress rows for a given story id
    
    Args:
        story_id: The ID of the story to get progress for
        
    Returns:
        A list of dictionaries representing progress entries
    """
    with db_session() as session:
        # Query all progress entries for the given story
        progress_entries = (
            session.query(StorylineProgress)
            .join(StoryQuestion, StorylineProgress.story_question_id == StoryQuestion.id)
            .filter(StoryQuestion.story_id == story_id)
            .order_by(desc(StorylineProgress.created_at))
            .all()
        )
        
        # Convert to list of dictionaries
        result = []
        for entry in progress_entries:
            progress_dict = {
                "storyline_progress_id": entry.storyline_progress_id,
                "story_question_id": entry.story_question_id,
                "duration": entry.duration,
                "score": entry.score,
                "attempts": entry.attempts,
                "created_at": entry.created_at,
                "question_id": entry.story_question.question_id,
                "storyline_id": entry.storyline_id if hasattr(entry, "storyline_id") else None,
            }
            result.append(progress_dict)
        
        return result


def UpdateProgress(story_id: int, progress_data: List[Dict[str, Any]]) -> List[StorylineProgress]:
    """
    Save a StorylineProgress row for each question in a story when the user submits the form for a story.
    
    Args:
        story_id: The ID of the story being submitted
        progress_data: A list of dictionaries, one for each question, with the duration, score, and attempts values
            Each dictionary should have:
            - question_id: The ID of the question
            - duration: Time spent on the question (in seconds)
            - score: Score achieved (typically 0-100)
            - attempts: Number of attempts made
            
    Returns:
        A list of the created StorylineProgress objects
    """
    created_entries = []
    
    with db_session() as session:
        # Get all StoryQuestion entries for this story
        story_questions = (
            session.query(StoryQuestion)
            .filter(StoryQuestion.story_id == story_id)
            .all()
        )
        
        # Create a mapping of question_id to story_question_id for quick lookup
        question_to_sq = {sq.question_id: sq.id for sq in story_questions}
        
        # Process each progress item
        for item in progress_data:
            question_id = item.get("question_id")
            
            if question_id not in question_to_sq:
                continue  # Skip if question doesn't belong to this story
                
            story_question_id = question_to_sq[question_id]
            
            # Create a new progress entry
            progress_entry = StorylineProgress(
                story_question_id=story_question_id,
                duration=item.get("duration"),
                score=item.get("score"),
                attempts=item.get("attempts"),
                created_at=datetime.datetime.utcnow()
            )
            
            session.add(progress_entry)
            created_entries.append(progress_entry)
        
        # Commit all changes
        session.commit()
        
        return created_entries