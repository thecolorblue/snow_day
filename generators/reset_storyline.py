import argparse
import logging
from sqlalchemy.orm import joinedload

from src.orm import (
    db_session,
    Story,
    Storyline,
    StorylineStep,
    StoryQuestion  # Import StoryQuestion although deletion is handled by cascade
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def reset_storyline(storyline_id: int):
    """
    Deletes all StorylineStep, Story, and StoryQuestion objects associated
    with the given storyline_id, but leaves the Storyline object itself.
    """
    logger.info(f"Attempting to clear associated data for storyline_id: {storyline_id}")
    with db_session() as session:
        try:
            # Fetch the storyline and eagerly load related steps and their stories
            storyline = (
                session.query(Storyline)
                .options(
                    joinedload(Storyline.steps).joinedload(StorylineStep.story)
                )
                .filter(Storyline.storyline_id == storyline_id)
                .one_or_none()
            )

            if not storyline:
                logger.warning(f"Storyline with ID {storyline_id} not found.")
                return

            logger.info(f"Found Storyline {storyline_id}. Preparing to clear associated steps, stories, and questions.")

            # Collect associated Story objects and StorylineStep objects
            stories_to_delete = []
            steps_to_delete = list(storyline.steps) # Create a copy to iterate over while deleting

            if steps_to_delete:
                logger.info(f"Found {len(steps_to_delete)} steps associated with Storyline {storyline_id}.")
                for step in steps_to_delete:
                    if step.story:
                        # Avoid adding duplicates if multiple steps somehow point to the same story
                        if step.story not in stories_to_delete:
                             stories_to_delete.append(step.story)
                    else:
                         logger.warning(f"StorylineStep {step.storyline_step_id} has no associated Story.")
            else:
                logger.info(f"No steps found for Storyline {storyline_id}.")


            # Delete the associated StorylineStep objects.
            # Cascade should handle deleting associated StorylineProgress if configured.
            if steps_to_delete:
                logger.info(f"Deleting {len(steps_to_delete)} associated StorylineStep objects...")
                for step in steps_to_delete:
                     logger.debug(f"Deleting StorylineStep {step.storyline_step_id}...")
                     session.delete(step)
                # Remove steps from the storyline's collection in memory
                storyline.steps = []
                logger.info("Associated StorylineStep objects deleted.")
            else:
                 logger.info("No associated StorylineStep objects to delete.")


            # Delete the associated Story objects.
            # Cascade should handle deleting associated StoryQuestion links.
            if stories_to_delete:
                logger.info(f"Deleting {len(stories_to_delete)} associated Story objects...")
                for story in stories_to_delete:
                    logger.debug(f"Deleting Story {story.id}...")
                    session.delete(story)
                logger.info("Associated Story objects deleted.")
            else:
                logger.info("No associated Story objects to delete.")

            # Commit the transaction
            # session.commit() is handled by the db_session context manager
            logger.info(f"Successfully cleared associated data for storyline {storyline_id}.")

            storyline.status = 'pending'

            session.add(storyline)

        except Exception as e:
            logger.error(f"An error occurred while resetting storyline {storyline_id}: {e}", exc_info=True)
            # Rollback is handled by the db_session context manager
            raise # Re-raise the exception after logging

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Clear a storyline by deleting its associated steps, stories, and questions, leaving the storyline record itself.")
    parser.add_argument("storyline_id", type=int, help="The ID of the storyline to reset.")

    args = parser.parse_args()

    reset_storyline(args.storyline_id)