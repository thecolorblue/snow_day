import datetime
import enum
import logging
import os
from sqlalchemy import JSON, Column, DateTime, Enum, Integer, String, Text, ForeignKey, create_engine, func
from sqlalchemy.orm import relationship, declarative_base, sessionmaker, joinedload

Base = declarative_base()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

database_url = os.getenv('DATABASE_URL')
if database_url:
    engine = create_engine(database_url)  # PostgreSQL
else:
    logger.error("DATABASE_URL environment variable not set")
    engine = create_engine("sqlite:///results.db")  # SQLite

SessionLocal = sessionmaker(autoflush=False, bind=engine)

from contextlib import contextmanager

@contextmanager
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Story(Base):
    __tablename__ = 'story'

    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(Text, nullable=False)

    questions = relationship("Question", back_populates="story", cascade="all, delete")


class Question(Base):
    __tablename__ = 'questions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    story_id = Column(Integer, ForeignKey('story.id', ondelete='CASCADE'), nullable=False)
    type = Column(Text, nullable=False)
    question = Column(Text, nullable=False)
    key = Column(Text, nullable=False)
    correct = Column(Text, nullable=False)
    answers = Column(Text)

    story = relationship("Story", back_populates="questions")

class Storyline(Base):
    __tablename__ = 'storyline'

    storyline_id = Column(Integer, primary_key=True, autoincrement=True)
    # Relationship to track original request context
    original_request = Column(Text)
    
    # Status tracking for storyline processing states
    status = Column(String, nullable=False)

    steps = relationship(
        "StorylineStep",
        back_populates="storyline",
        cascade="all, delete-orphan"
    )

    # Relationship to load progress items referencing this storyline
    progress = relationship(
        "StorylineProgress",
        back_populates="storyline",
        cascade="all, delete-orphan"
    )

class StorylineStep(Base):
    __tablename__ = 'storyline_step'

    storyline_step_id = Column(Integer, primary_key=True, autoincrement=True)
    storyline_id = Column(Integer, ForeignKey('storyline.storyline_id', ondelete='CASCADE'), nullable=False)
    step = Column(Integer, nullable=False)
    story_id = Column(Integer, ForeignKey('story.id'), nullable=False)

    # Existing relationships
    storyline = relationship("Storyline", back_populates="steps")
    story = relationship("Story")

    # NEW: link back to StorylineProgress
    progress = relationship(
        "StorylineProgress",
        back_populates="storyline_step",
        cascade="all, delete-orphan"
    )

class StorylineProgress(Base):
    __tablename__ = 'storyline_progress'

    storyline_progress_id = Column(Integer, primary_key=True, autoincrement=True)
    storyline_id = Column(Integer, ForeignKey('storyline.storyline_id', ondelete='CASCADE'), nullable=False)
    storyline_step_id = Column(Integer, ForeignKey('storyline_step.storyline_step_id', ondelete='CASCADE'), nullable=False)
    story_id = Column(Integer, ForeignKey('story.id'), nullable=False)
    duration = Column(Integer)
    score = Column(Integer)
    attempts = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Existing relationships
    storyline = relationship("Storyline", back_populates="progress")
    story = relationship("Story")
    
    # NEW: link back to StorylineStep
    storyline_step = relationship("StorylineStep", back_populates="progress")




class TaskStatus(enum.Enum):
    PENDING = 'PENDING'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'

class TaskQueue(Base):
    __tablename__ = 'task_queue'

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    context = Column(JSON, nullable=True)
    priority = Column(Integer, default=1)  # Assuming higher numbers mean higher priority
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<TaskQueue(id={self.id}, title={self.title}, status={self.status}, " \
               f"priority={self.priority}, created_at={self.created_at}, updated_at={self.updated_at})>"


def get_storyline_with_step_progress(session, storyline_id):
    """
    Return a dictionary representing a single Storyline record, 
    including each StorylineStep and its associated StorylineProgress entries.
    """
    # 1. Query the Storyline, loading steps, stories, and progress in one go.
    storyline = (
        session.query(Storyline)
        .options(
            # Load each step plus the associated Story
            joinedload(Storyline.steps).joinedload(StorylineStep.story),
            # Load the StorylineStep.progress relationship
            joinedload(Storyline.steps).joinedload(StorylineStep.progress)
        )
        .filter(Storyline.storyline_id == storyline_id)
        .one_or_none()
    )

    if storyline is None:
        return None

    # 2. Build a nested dictionary response
    # Top-level: storyline info
    storyline_dict = {
        "storyline_id": storyline.storyline_id,
        "steps": []
    }

    # 3. For each step, add a "progress" key which is a list of progress dictionaries
    for step in storyline.steps:
        step_dict = {
            "storyline_step_id": step.storyline_step_id,
            "step": step.step,
            "story_id": step.story_id,
            "progress": []
        }

        for p in step.progress:
            step_dict["progress"].append({
                "storyline_progress_id": p.storyline_progress_id,
                "storyline_id": p.storyline_id,
                "storyline_step_id": p.storyline_step_id,
                "story_id": p.story_id,
                "duration": p.duration,
                "score": p.score,
                "attempts": p.attempts,
            })

        storyline_dict["steps"].append(step_dict)

    return storyline_dict

def create_storyline_from_dict(session, stories_data):
    """
    Creates a new Storyline record, a StorylineStep for each story item in stories_data,
    and corresponding Story/Question entries as described in stories_data.
    
    :param session: SQLAlchemy session object
    :param stories_data: A list of dicts, each containing "content" and "questions".
        Example:
        [
          {
            "content": "story content",
            "questions": [
              {
                "type": "question_type",
                "question": "text",
                "key": "unique key",
                "correct": "correct answer",
                "answers": "comma,seperated,answers"
              }
            ]
          }
        ]
    :return: The newly created Storyline object
    """

    # 1. Create a new Storyline
    storyline = Storyline()
    session.add(storyline)
    session.flush()  
    # flush ensures storyline_id is available for subsequent inserts

    # 2. Iterate over each item in stories_data
    for step_index, item in enumerate(stories_data, start=1):
        # Create a Story
        new_story = Story(content=item["content"])
        session.add(new_story)
        session.flush()  
        # flush ensures new_story.id is available for the questions/step

        # Optionally create the Questions for this Story
        questions = item.get("questions", [])
        for q in questions:
            new_question = Question(
                story_id=new_story.id,
                type=q["type"],
                question=q["question"],
                key=q["key"],
                correct=q["correct"],
                answers=q["answers"]
            )
            session.add(new_question)

        # Create a StorylineStep referencing our new Story
        new_step = StorylineStep(
            storyline_id=storyline.storyline_id,
            step=step_index,
            story_id=new_story.id
        )
        session.add(new_step)

    # 3. Commit the entire transaction
    session.commit()

    return storyline

