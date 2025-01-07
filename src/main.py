from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()
trick_words = [
'Why',
'Sure',
'House',
'Together',
'Only',
'Move',
'Place',
'Right',
'Enough',
'Laugh',
]

# Mount static files directory (if you have any)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    story = """
Maeve and Paige's Silly Adventure

Maeve and Paige were the best of friends. They once made hats out of spaghetti just because it was Tuesday! Every day after school, they played together at one of their houses. Maeve loved Paige's laugh. It sounded funny, like a donkey and a squeaky door at the same time. Even grumpy old Mr. Jenkins next door would smile when he heard it.

The Idea

One sunny day, Maeve sat on her porch wearing a cape made from a shower curtain. Paige arrived with a wagon full of rubber chickens. “Maeve, let's build a clubhouse today! A place just for us!”

Maeve's eyes got big. “Sure! But where should we build it?”

Paige pointed to the big oak tree in Maeve's yard. “Right there! It's perfect. The squirrels already threw me an acorn party there yesterday.” 

Building the Clubhouse

The two friends got to work. Maeve brought blankets, pillows, and a jar of “Emergency Pickles” from her house. Paige found old decorations in her garage, like a disco ball. Together, they made the silliest clubhouse ever. It had a slide made of banana peels, a doorbell that quacked, and a sign that said, "Do Not Enter Unless You're a Unicorn." 

When it was done, Maeve plopped onto a pillow shaped like a slice of pizza. “This is the best place ever. It even smells like spaghetti!” 

Playing 'Why?'

Paige laughed. “Only the best for us. What should we do first in our clubhouse?”

Maeve thought. “Let's play 'Why?'” 'Why?' was their favorite game. One person asked a question, and the other gave the silliest answer. 

“Why do birds fly?” Paige asked.

Maeve giggled. “Because they don't want to walk on sticky gum!”

They both laughed so hard Paige snorted, which made them laugh even more. A squirrel peeked in, wondering what was so funny. 

A Special Clubhouse

As they rested under the tree, Paige asked, “What if we ever have to move away? Would our clubhouse still be special?”

Maeve thought. “It's not the place that makes it special. It's us being here together. And the rubber chickens.” 

Paige nodded. “You're right. As long as we're together, any place can be fun. Even a bathtub full of pudding!” 

Until Tomorrow

The sun began to set. Paige said, “I wish we could stay here forever. Or at least until the squirrels kick us out.” 

“Me too,” Maeve said. “But it's dinner time. Let's meet here tomorrow and do it all over again. And bring more pickles.” 

Paige nodded. “You're right. Tomorrow, we'll add a 'No Parents Allowed Unless They Bring Ice Cream' sign.”

Maeve laughed. “Good idea! But we should let them in if they bring cookies shaped like dinosaurs. Only the good ones though.” 

Paige agreed. “Dinosaur cookies are always good enough.”

Forever Friends

The two friends hugged and went home. Maeve thought about how lucky she was to have a friend like Paige. She knew their silly friendship would last forever. 

And she couldn't wait for tomorrow's adventure. 
    """

    return templates.TemplateResponse("classroom.html", {
        "request": request,
        "story": story,
        "questions": [
            {
                "type": "input",
                "question": "spell <play-word>Why</play-word>"
            },
            {
                "type": "input",
                "question": "spell <play-word>Sure</play-word>"
            },
            {
                "type": "input",
                "question": "spell <play-word>House</play-word>"
            },
            {
                "type": "input",
                "question": "spell <play-word>Together</play-word>"
            },
            {
                "type": "input",
                "question": "spell <play-word>Only</play-word>"
            },
            {
                "type": "input",
                "question": "spell <play-word>Move</play-word>"
            },
            {
                "type": "input",
                "question": "spell <play-word>Place</play-word>"
            },
            {
                "type": "input",
                "question": "spell <play-word>Right</play-word>"
            },
            {
                "type": "input",
                "question": "spell <play-word>Enough</play-word>"
            },
        ]
    })
