from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()

# Mount static files directory (if you have any)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    story = """
It was a dull, gray afternoon, and Nora and Bella were lying on the grass in Nora's backyard, staring at the clouds. Coffee, Nora's golden retriever, was sprawled beside them, gnawing on a sock he had "borrowed" from the laundry basket.

“I'm soooo bored,” Bella groaned.
“Same,” Nora said. “Even Coffee looks bored, and he's got a sock.”

Coffee paused mid-chew to wag his tail, but even his usual enthusiasm seemed a bit lackluster.

“I wish something exciting would happen,” Bella said, throwing a stick lazily into the air.

At that exact moment, something did happen. A squirrel came tearing across the yard, chittering loudly, with another squirrel chasing it. But that wasn't the weird part.

The weird part was the tiny red backpack strapped to the first squirrel.
    """

    return templates.TemplateResponse("classroom.html", {
        "request": request,
        "story": story,
        "questions": [
            {
                "question": "what number comes first?",
                "answers": [
                    "1",
                    "2",
                    "3"
                ]
            }
        ]

    })