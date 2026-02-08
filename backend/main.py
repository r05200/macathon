# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.gemini import GeminiAI
from modules import snowflake_db

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

gemini = GeminiAI()


@app.post("/api/gemini")
async def gemini_endpoint(data: dict):
    """
    Input: {"prompt": "your prompt here"}
    Output: {"response": "gemini's answer"}
    """
    prompt = data.get('prompt')
    response = gemini.ask(prompt)
    
    return {"response": response}


@app.get("/api/snowflake/url-data")
async def snowflake_url_data():
    """GET: returns both predefined Snowflake result sets."""
    return snowflake_db.get_url_data()