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


def build_summary_prompt(url_data, cookie_data):
    """Build a prompt template so the model knows what each field is and can write a clean summary."""
    # --- URL tracking: what the model is seeing ---
    by_company = url_data.get("by_company") or []
    by_category = url_data.get("by_category") or []
    week_over_week = url_data.get("week_over_week_change") or []
    monthly = url_data.get("monthly_privacy_stats") or []

    cookie_list = cookie_data if isinstance(cookie_data, list) else []
    cookie_count = len(cookie_list)
    cookie_sample = cookie_list[:5] if cookie_list else []

    prompt = """You are summarizing a user's privacy/tracking report. Below is the raw data. Write a short, easy-to-read summary in 5–6 lines. No intro, no bullet points—just plain sentences.

## URL TRACKING (last 7 days)
This is how often the user was tracked by company and category.

Top companies by track count (company → number of times seen):
{by_company}

Top categories (category → total occurrences, how many companies):
{by_category}

Week-over-week change (company → % change vs previous week; 999.9% means new tracker):
{week_over_week}

Monthly trend (if any): {monthly}

## COOKIE DATA
Total cookies stored: {cookie_count}
Sample cookies (domain, company, category): {cookie_sample}

---
Write your 5–6 line summary now. Simple, factual, easy to understand."""

    return prompt.format(
        by_company=by_company if by_company else "(no data)",
        by_category=by_category if by_category else "(no data)",
        week_over_week=week_over_week if week_over_week else "(no data)",
        monthly=monthly[:3] if monthly else "(no data)",
        cookie_count=cookie_count,
        cookie_sample=cookie_sample if cookie_sample else "(no cookies)",
    )


@app.get("/api/snowflake/get_url_data")
async def snowflake_url_data():
    """GET: returns both predefined Snowflake result sets."""
    return snowflake_db.get_url_data()


@app.get("/api/snowflake/cookie_info")
async def snowflake_cookie_info():
    """GET: returns all cookie data with every field from COOKIES_DATA."""
    return snowflake_db.cookie_info()


@app.get("/api/summary")
async def get_summary():
    """
    GET: fetches url_data + cookie_info, sends a clean prompt to Gemini,
    returns a 5–6 line summary.
    """
    url_data = snowflake_db.get_url_data()
    cookie_data = snowflake_db.cookie_info()
    prompt = build_summary_prompt(url_data, cookie_data)
    summary = gemini.ask(prompt)
    return {"summary": summary.strip()}


@app.get("/api/gemini")
async def gemini_summary():
    """GET: url_data + cookie_info → Gemini → 5–6 line summary. Returns { summary } only."""
    url_data = snowflake_db.get_url_data()
    cookie_data = snowflake_db.cookie_info()
    prompt = build_summary_prompt(url_data, cookie_data)
    summary = gemini.ask(prompt)
    return {"summary": summary.strip()}