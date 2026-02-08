# Gemini module

import os

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import google.genai as genai

MODEL_NAME = "gemini-3-flash-preview"
load_dotenv()

class GeminiAI:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        self.client = genai.Client(api_key=api_key)
    
    def ask(self, prompt):
        response = self.client.models.generate_content(
            model='gemini-3-flash-preview',
            contents=prompt
        )
        return response.text