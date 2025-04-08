import random
from typing import List

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
from . import assignments

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
    questions = []

    for word in ordered_required_words:
        original_question = word_to_question_map[word]

        q = Question(
            type=original_question.type,
            question=original_question.question,
            key=original_question.key,
            correct=original_question.correct
        )
        q.type = random.choice(['input', 'select'])
        if q.type == 'select':
            q.answers = gen_incorrect_answers(q.correct)
        questions.append(q)

    story_dict = assignments.save_assignment(story, questions)

    generate_tts(raw_text, f'assignment-{story_dict["story_id"]}.mp3')