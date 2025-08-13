import argparse
import os
from dotenv import load_dotenv
import requests
import logging
import re
import sys


# Load environment variables from .env file
load_dotenv()

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from src.orm import db_session, Story

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

OUTPUT_DIR = "forced_alignment"

def strip_html(html_string: str) -> str:
    """Removes HTML tags from a string."""
    if not html_string:
        return ""
    return re.sub('<[^<]+?>', '', html_string)

def download_file(url, destination):
    """Downloads a file from a URL to a destination path."""
    try:
        logger.info(f"Downloading from {url}...")
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(destination, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        logger.info(f"Successfully downloaded to {destination}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download {url}: {e}")
        return False

def init_forced_alignment(story_id: int):
    """
    Downloads the content and audio for a given story ID to prepare for forced alignment.
    """
    logger.info(f"Initializing forced alignment for story_id: {story_id}")

    # Ensure the output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    logger.info(f"Output directory is '{os.path.abspath(OUTPUT_DIR)}'")


    with db_session() as session:
        try:
            story = session.get(Story, story_id)

            if not story:
                logger.warning(f"Story with ID {story_id} not found.")
                return

            logger.info(f"Found Story {story_id}. Processing content and audio.")

            # 1. Clean and save the story content to a text file
            raw_content = strip_html(story.content)
            text_filename = os.path.join(OUTPUT_DIR, f"story_text_{story.id}.txt")
            try:
                with open(text_filename, 'w', encoding='utf-8') as f:
                    f.write(raw_content)
                logger.info(f"Story content saved to {text_filename}")
            except IOError as e:
                logger.error(f"Failed to write story content to {text_filename}: {e}")
                return # If we can't write the text, forced alignment is not possible.
            
            # 2. Download the audio file
            if story.audio:
                audio_filename = os.path.join(OUTPUT_DIR, f"story_audio_{story.id}.mp3")
                download_file(story.audio, audio_filename)
            else:
                logger.warning(f"Story {story_id} has no audio URL. Cannot download audio.")

        except Exception as e:
            logger.error(f"An error occurred while processing story {story_id}: {e}", exc_info=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download story content and audio for forced alignment.")
    parser.add_argument("story_id", type=int, help="The ID of the story to process.")

    args = parser.parse_args()

    init_forced_alignment(args.story_id)
