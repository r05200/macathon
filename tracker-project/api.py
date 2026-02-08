"""
FastAPI Integration for Tracker Identification
-----------------------------------------------
This file provides REST API endpoints for the tracker identification service.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from tracker import TrackerEnricher
from snowflake_db import SnowflakeDB

# Initialize FastAPI app
app = FastAPI(
    title="Tracker Identification API",
    description="API for identifying tracking domains and companies",
    version="1.0.0"
)

# Add CORS middleware to allow extension to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize tracker identifier and database globally (loaded once at startup)
tracker_identifier = None
snowflake_db = None


@app.on_event("startup")
async def startup_event():
    """
    Initialize the tracker database and Snowflake when the API starts.
    This runs once when the server starts up.
    """
    global tracker_identifier, snowflake_db
    tracker_identifier = TrackerEnricher()
    print("✓ Tracker database loaded successfully")

    try:
        snowflake_db = SnowflakeDB()
        print("✓ Snowflake connection established")
    except Exception as e:
        print(f"⚠️  Snowflake connection failed: {e}")
        print("⚠️  API will run without database features")


# Request/Response Models
class DomainRequest(BaseModel):
    """Request model for single domain identification"""
    domain: str = Field(..., description="Domain or URL to identify", example="google-analytics.com")


class BatchDomainRequest(BaseModel):
    """Request model for batch domain identification"""
    domains: List[str] = Field(..., description="List of domains or URLs to identify", example=["doubleclick.net", "facebook.com"])


class TrackerResponse(BaseModel):
    """Response model for tracker identification"""
    domain: str
    company: str
    category: str
    description: str
    is_tracker: bool


class TrackerData(BaseModel):
    """Model for tracker data from extension"""
    domain: str = Field(..., description="Tracker domain")
    fullUrl: str = Field(default="", description="Full URL of the tracker")
    type: str = Field(default="", description="Request type (script, image, etc)")
    initiator: str = Field(default="", description="Site that initiated the request")
    company: str = Field(default="", description="Company that owns the tracker")
    category: str = Field(default="", description="Category (advertising, analytics, etc)")
    isBlocked: bool = Field(default=False, description="Whether tracker was blocked")
    timestamp: str = Field(default="", description="When tracker was detected")


class CookieData(BaseModel):
    """Model for cookie data from extension"""
    name: str = Field(..., description="Cookie name")
    domain: str = Field(..., description="Cookie domain")
    value: str = Field(default="", description="Cookie value")
    company: str = Field(default="", description="Company that set the cookie")
    category: str = Field(default="", description="Cookie category")
    httpOnly: bool = Field(default=False, description="HttpOnly flag")
    secure: bool = Field(default=False, description="Secure flag")
    sameSite: str = Field(default="", description="SameSite attribute")
    expiration: str = Field(default="", description="Expiration date")
    isThirdParty: bool = Field(default=False, description="Is third-party cookie")
    timestamp: str = Field(default="", description="When cookie was detected")


class UploadRequest(BaseModel):
    """Request model for uploading tracker/cookie data from extension"""
    email: str = Field(..., description="User email address")
    deviceId: str = Field(..., description="Device identifier")
    trackers: List[Dict[str, Any]] = Field(default=[], description="List of detected trackers")
    cookies: List[Dict[str, Any]] = Field(default=[], description="List of detected cookies")
    timestamp: str = Field(default="", description="Timestamp of upload")


class BlocklistAddRequest(BaseModel):
    """Request model for adding domain to blocklist"""
    domain: str = Field(..., description="Domain to block")
    email: str = Field(..., description="User email address")
    reason: str = Field(default="", description="Reason for blocking")


# API Endpoints
@app.get("/", tags=["Health"])
async def root():
    """
    Health check endpoint.
    Returns basic API information.
    """
    return {
        "status": "online",
        "service": "Tracker Identification API",
        "version": "1.0.0"
    }


@app.post("/identify", response_model=TrackerResponse, tags=["Tracker Identification"])
async def identify_tracker(request: DomainRequest):
    """
    Identify a single tracking domain.
    
    Args:
        request: DomainRequest containing the domain to identify
    
    Returns:
        TrackerResponse with company, category, and description
    
    Example:
        POST /identify
        {
            "domain": "google-analytics.com"
        }
        
        Response:
        {
            "domain": "google-analytics.com",
            "company": "Google Analytics",
            "category": "analytics",
            "description": "...",
            "is_tracker": true
        }
    """
    if not tracker_identifier:
        raise HTTPException(status_code=503, detail="Tracker database not initialized")
    
    try:
        result = tracker_identifier.identify(request.domain)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error identifying domain: {str(e)}")


@app.post("/identify/batch", tags=["Tracker Identification"])
async def identify_trackers_batch(request: BatchDomainRequest):
    """
    Identify multiple tracking domains at once.
    
    Args:
        request: BatchDomainRequest containing list of domains
    
    Returns:
        Dictionary mapping each domain to its tracker information
    
    Example:
        POST /identify/batch
        {
            "domains": ["doubleclick.net", "facebook.com", "example.com"]
        }
        
        Response:
        {
            "doubleclick.net": {
                "domain": "doubleclick.net",
                "company": "Google",
                "category": "advertising",
                ...
            },
            ...
        }
    """
    if not tracker_identifier:
        raise HTTPException(status_code=503, detail="Tracker database not initialized")
    
    try:
        results = tracker_identifier.identify_batch(request.domains)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error identifying domains: {str(e)}")


@app.get("/stats", tags=["Database Info"])
async def get_database_stats():
    """
    Get statistics about the tracker database.

    Returns:
        Statistics including total trackers, companies, and categories

    Example Response:
        {
            "total_trackers": 1500,
            "total_companies": 250,
            "categories": ["advertising", "analytics", "social_media", ...]
        }
    """
    if not tracker_identifier:
        raise HTTPException(status_code=503, detail="Tracker database not initialized")

    try:
        stats = tracker_identifier.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")


# ============================================
# EXTENSION API ENDPOINTS
# ============================================

@app.get("/api/health", tags=["Extension API"])
async def api_health():
    """
    Health check endpoint for the extension.
    Returns status of API and database connection.

    Example Response:
        {
            "status": "ok",
            "database": "connected"
        }
    """
    return {
        "status": "ok",
        "database": "connected" if snowflake_db else "disconnected"
    }


@app.post("/api/trackers", tags=["Extension API"])
async def upload_tracker_data(request: UploadRequest):
    """
    Upload tracker and cookie data from the extension.
    This endpoint receives detected trackers and cookies from browser extension.

    Args:
        request: UploadRequest containing email, deviceId, trackers, and cookies

    Returns:
        Success status and counts of inserted records

    Example:
        POST /api/trackers
        {
            "email": "user@example.com",
            "deviceId": "abc-123",
            "trackers": [
                {
                    "domain": "doubleclick.net",
                    "fullUrl": "https://doubleclick.net/track",
                    "type": "script",
                    "initiator": "example.com",
                    "company": "Google",
                    "category": "advertising",
                    "isBlocked": true,
                    "timestamp": "2024-01-01T12:00:00Z"
                }
            ],
            "cookies": [
                {
                    "name": "_ga",
                    "domain": "google-analytics.com",
                    "value": "GA1.2.xxx",
                    "company": "Google",
                    "category": "analytics",
                    "httpOnly": false,
                    "secure": true,
                    "sameSite": "lax",
                    "expiration": "2025-01-01T00:00:00Z",
                    "isThirdParty": true,
                    "timestamp": "2024-01-01T12:00:00Z"
                }
            ],
            "timestamp": "2024-01-01T12:00:00Z"
        }

        Response:
        {
            "success": true,
            "cookies_inserted": 1,
            "trackers_inserted": 1
        }
    """
    if not snowflake_db:
        # If database is not available, still accept the data but log warning
        print("⚠️  Database not available, data not persisted")
        return {
            "success": False,
            "message": "Database not available",
            "cookies_inserted": 0,
            "trackers_inserted": 0
        }

    print(f"📥 Received data from extension: {len(request.trackers)} trackers, {len(request.cookies)} cookies")
    print(f"👤 User: {request.email}, Device: {request.deviceId}")

    cookies_inserted = 0
    trackers_inserted = 0

    try:
        # Insert cookies
        if request.cookies:
            cookies_inserted = snowflake_db.insert_cookies(
                request.cookies,
                request.email,
                request.deviceId
            )
            print(f"✅ Inserted {cookies_inserted} cookies")

        # Insert trackers
        if request.trackers:
            trackers_inserted = snowflake_db.insert_trackers(
                request.trackers,
                request.email,
                request.deviceId
            )
            print(f"✅ Inserted {trackers_inserted} trackers")

        # Enrich any unknown trackers in background
        try:
            enrich_unknown_trackers()
        except Exception as e:
            print(f"Warning: Enrichment failed: {e}")

        return {
            "success": True,
            "cookies_inserted": cookies_inserted,
            "trackers_inserted": trackers_inserted
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading data: {str(e)}")


@app.get("/api/blocklist", tags=["Extension API"])
async def get_blocklist(email: str, deviceId: Optional[str] = ""):
    """
    Get the user's blocklist domains.
    Extension syncs this list to block trackers.

    Args:
        email: User's email address
        deviceId: Device identifier (optional)

    Returns:
        Dictionary with list of blocked domains

    Example:
        GET /api/blocklist?email=user@example.com&deviceId=abc-123

        Response:
        {
            "domains": ["doubleclick.net", "facebook.net", "ads.twitter.com"]
        }
    """
    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        domains = snowflake_db.get_blocklist(email)
        return {"domains": domains}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching blocklist: {str(e)}")


@app.post("/api/blocklist", tags=["Extension API"])
async def add_to_blocklist(request: BlocklistAddRequest):
    """
    Add a domain to the user's blocklist.

    Args:
        request: BlocklistAddRequest with domain, email, and optional reason

    Returns:
        Success status

    Example:
        POST /api/blocklist
        {
            "domain": "ads.example.com",
            "email": "user@example.com",
            "reason": "Aggressive tracking"
        }

        Response:
        {
            "success": true,
            "message": "Domain added to blocklist"
        }
    """
    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        added = snowflake_db.add_to_blocklist(
            request.domain,
            request.email,
            request.reason
        )

        if added:
            return {"success": True, "message": "Domain added to blocklist"}
        else:
            return {"success": True, "message": "Domain already in blocklist"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding to blocklist: {str(e)}")


# ============================================
# OVERVIEW API ENDPOINT
# ============================================

@app.get("/api/overview", tags=["Dashboard API"])
async def get_overview(email: str = ""):
    """
    Get overview stats for the frontend dashboard.
    Returns total events, trackers, unique sites, daily time series, and categories.
    Includes 6 days of dummy historical data before real data begins.
    Filters by user email if provided.
    """
    from datetime import datetime, timedelta
    import random

    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        data = snowflake_db.get_overview_stats(email=email)

        total_trackers = data["totalTrackers"]
        total_cookies = 0  # cookies not accessible yet
        total_events = total_trackers + total_cookies
        unique_sites = data["uniqueSites"]

        # Build 7-day time series with 6 days of dummy data + real today
        real_daily = {row["DATE"]: row["VALUE"] for row in data["dailyEvents"]}

        time_series = []
        today = datetime.now().date()
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_str = day.isoformat()
            if day_str in real_daily:
                time_series.append({"date": day_str, "value": real_daily[day_str], "isReal": True})
            else:
                # Dummy data for days without real data
                time_series.append({"date": day_str, "value": random.randint(80, 250), "isReal": False})

        # Categories ranked by count
        categories = [
            {"category": row["CATEGORY"], "count": row["COUNT"]}
            for row in data["categories"]
        ]

        return {
            "totalEvents": total_events,
            "uniqueSites": unique_sites,
            "totalTrackers": total_trackers,
            "totalCookies": total_cookies,
            "timeSeries": time_series,
            "categories": categories
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching overview: {str(e)}")


# ============================================
# TRENDS API ENDPOINT
# ============================================

@app.get("/api/trends", tags=["Dashboard API"])
async def get_trends(days: int = 7, email: str = ""):
    """
    Get trends data for the Trends page.
    Returns daily tracker counts with dummy data for missing days.
    Filters by user email if provided.
    """
    from datetime import datetime, timedelta
    import random

    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        data = snowflake_db.get_trends_data(days, email=email)

        real_tracker_daily = {row["DATE"]: row["COUNT"] for row in data["trackerDaily"]}

        tracker_series = []
        cookie_series = []
        today = datetime.now().date()
        for i in range(days - 1, -1, -1):
            day = today - timedelta(days=i)
            day_str = day.isoformat()
            if day_str in real_tracker_daily:
                tracker_series.append({"date": day_str, "count": real_tracker_daily[day_str], "isReal": True})
            else:
                tracker_series.append({"date": day_str, "count": random.randint(30, 90), "isReal": False})
            # Cookies: dummy data since we can't access cookies DB yet
            cookie_series.append({"date": day_str, "count": random.randint(10, 50), "isReal": False})

        return {
            "trackerDaily": tracker_series,
            "cookieDaily": cookie_series
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trends: {str(e)}")


# ============================================
# BREAKDOWN API ENDPOINT
# ============================================

@app.get("/api/breakdown", tags=["Dashboard API"])
async def get_breakdown(email: str = ""):
    """
    Get breakdown stats for the Breakdown (Trackers) page.
    Returns top initiators, top domains, company groups, and all trackers.
    Filters by user email if provided.
    """
    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        data = snowflake_db.get_breakdown_stats(email=email)

        top_by_initiator = [
            {"initiator": row["INITIATOR"], "count": row["COUNT"]}
            for row in data["topByInitiator"]
        ]

        top_by_domain = [
            {"domain": row["DOMAIN_NAME"], "company": row["COMPANY"] or "Unknown", "count": row["COUNT"]}
            for row in data["topByDomain"]
        ]

        # Group company_domain_rows into company groups
        company_groups_map = {}
        for row in data["companyDomainRows"]:
            company = row["COMPANY"]
            if company not in company_groups_map:
                company_groups_map[company] = {"company": company, "domains": []}
            company_groups_map[company]["domains"].append({
                "domain": row["DOMAIN_NAME"],
                "category": row["CATEGORY"],
                "totalHits": row["TOTAL_HITS"],
                "entryCount": row["ENTRY_COUNT"]
            })
        company_groups = list(company_groups_map.values())

        # Format all trackers
        all_trackers = []
        for row in data["allTrackers"]:
            all_trackers.append({
                "id": str(row["ID"]),
                "domain": row["DOMAIN_NAME"] or "",
                "fullUrl": row["FULL_URL"] or "",
                "initiator": row["INITIATOR"] or "",
                "company": row["COMPANY"] or "Unknown",
                "category": row["CATEGORY"] or "unknown",
                "occurrences": row["OCCURRENCES"] or 1,
                "createdAt": str(row["CREATED_AT"]) if row["CREATED_AT"] else ""
            })

        return {
            "totalTrackers": data["totalTrackers"],
            "topByInitiator": top_by_initiator,
            "topByDomain": top_by_domain,
            "companyGroups": company_groups,
            "allTrackers": all_trackers
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching breakdown: {str(e)}")


# ============================================
# COOKIE INSERT API ENDPOINT
# ============================================

class CookieUploadRequest(BaseModel):
    """Request model for uploading cookie data from extension"""
    email: str = Field(..., description="User email address")
    deviceId: str = Field(..., description="Device identifier")
    cookies: List[Dict[str, Any]] = Field(default=[], description="List of detected cookies")
    timestamp: str = Field(default="", description="Timestamp of upload")


@app.post("/api/cookies/upload", tags=["Extension API"])
async def upload_cookie_data(request: CookieUploadRequest):
    """
    Upload cookie data from the extension (similar to /api/trackers for trackers).
    Currently cookie insertion is disabled due to permissions, but the endpoint is ready.
    """
    if not snowflake_db:
        return {
            "success": False,
            "message": "Database not available",
            "cookies_inserted": 0
        }

    print(f"📥 Received cookie data: {len(request.cookies)} cookies")
    print(f"👤 User: {request.email}, Device: {request.deviceId}")

    try:
        cookies_inserted = snowflake_db.insert_cookies(
            request.cookies,
            request.email,
            request.deviceId
        )

        return {
            "success": True,
            "cookies_inserted": cookies_inserted
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading cookies: {str(e)}")


# ============================================
# DASHBOARD API ENDPOINTS
# ============================================

@app.get("/api/cookies", tags=["Dashboard API"])
async def get_cookies(email: str, limit: int = 500):
    """
    Get cookie history for a user (for dashboard).

    Args:
        email: User's email address
        limit: Maximum number of cookies to return

    Returns:
        Dictionary with cookies list and statistics
    """
    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        cookies = snowflake_db.get_cookies(email, limit)
        stats = snowflake_db.get_cookie_stats(email)
        return {"cookies": cookies, "stats": stats}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching cookies: {str(e)}")


@app.get("/api/trackers/history", tags=["Dashboard API"])
async def get_tracker_history(email: str, limit: int = 500):
    """
    Get tracker history for a user (for dashboard).

    Args:
        email: User's email address
        limit: Maximum number of trackers to return

    Returns:
        Dictionary with trackers list and statistics by company
    """
    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        trackers = snowflake_db.get_trackers(email, limit)
        stats = snowflake_db.get_tracker_stats(email)
        return {"trackers": trackers, "stats": stats}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching tracker history: {str(e)}")


# ============================================
# SECURITY REPORT API ENDPOINT
# ============================================

@app.get("/api/security-report", tags=["Dashboard API"])
async def get_security_report(email: str, start_date: str = ""):
    """
    Generate a security report using Gemini AI.
    Analyzes all tracker data from start_date to present for the given user.
    Returns overall score, summary, top 3 least secure sites, and per-domain scores.
    """
    import os
    import json

    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

    if not start_date:
        from datetime import datetime, timedelta
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

    try:
        # Get tracker data from Snowflake
        report_data = snowflake_db.get_security_report_data(email, start_date)

        if not report_data["domainStats"]:
            return {
                "overallScore": 100,
                "summary": "No tracking data found for this period. Your browsing appears clean!",
                "top3Least": [],
                "domainScores": []
            }

        # Build prompt for Gemini
        domain_summary = []
        for d in report_data["domainStats"]:
            domain_summary.append(
                f"- {d['DOMAIN_NAME']} (company: {d['COMPANY']}, category: {d['CATEGORY']}, "
                f"hits: {d['TOTAL_HITS']}, seen on {d['UNIQUE_INITIATORS']} different sites)"
            )
        domain_text = "\n".join(domain_summary[:50])  # Limit to top 50

        prompt = f"""You are a cybersecurity analyst evaluating a user's web browsing privacy and security.

Here is the tracking data detected on this user's browser from {start_date} to today:

Total tracker requests: {report_data['totalTrackers']}
Unique websites visited: {report_data['uniqueSites']}
Tracker domains detected:
{domain_text}

Analyze this data and respond with ONLY a valid JSON object (no markdown, no code fences) in this exact format:
{{
  "overallScore": <number 0-100, where 100 is most secure>,
  "summary": "<2-3 sentence analysis of the user's security posture>",
  "domainScores": [
    {{"domain": "<tracker domain>", "score": <0-100>, "reason": "<brief reason>"}},
    ...
  ]
}}

Rules for scoring:
- Advertising/tracking domains get lower scores (more privacy risk)
- Analytics domains get moderate scores
- Social media trackers get low-moderate scores
- Domains with very high hit counts get lower scores (more pervasive tracking)
- Domains seen across many different sites get lower scores
- The overall score should reflect the aggregate privacy risk
- Include ALL tracker domains from the data in domainScores
- Sort domainScores by score ascending (least secure first)"""

        # Call Gemini API
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if not gemini_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured in .env")

        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel("gemini-flash-lite-latest")
        response = model.generate_content(prompt)

        # Parse the JSON response
        response_text = response.text.strip()
        # Remove markdown code fences if present
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3].strip()

        result = json.loads(response_text)

        # Extract top 3 least secure
        all_scores = result.get("domainScores", [])
        top3 = all_scores[:3] if len(all_scores) >= 3 else all_scores

        return {
            "overallScore": result.get("overallScore", 50),
            "summary": result.get("summary", "Analysis complete."),
            "top3Least": top3,
            "domainScores": all_scores
        }

    except json.JSONDecodeError as e:
        print(f"Failed to parse Gemini response: {e}")
        print(f"Raw response: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating security report: {str(e)}")


# ============================================
# ENRICHMENT HELPER
# ============================================

def enrich_unknown_trackers():
    """
    Background task: Pull unknown trackers from Snowflake,
    enrich with TrackerEnricher, and update database
    """
    if not snowflake_db or not tracker_identifier:
        return

    try:
        unenriched = snowflake_db.get_unenriched_trackers(limit=50)

        for tracker in unenriched:
            try:
                # Create a tracker data dict for enrichment
                tracker_data = {
                    'domain': tracker['DOMAIN_NAME'],
                    'url': tracker.get('FULL_URL', ''),
                    'company': tracker.get('COMPANY', ''),
                    'category': tracker.get('CATEGORY', ''),
                }

                # Enrich using the correct method name
                enriched = tracker_identifier.enrich(tracker_data)

                if enriched.get('company') and enriched['company'] not in ['Unknown', '']:
                    snowflake_db.update_enriched_tracker(
                        tracker['ID'],
                        enriched['company'],
                        enriched['category']
                    )
            except Exception as e:
                print(f"Error enriching tracker {tracker.get('DOMAIN_NAME')}: {e}")

    except Exception as e:
        print(f"Error in enrichment task: {e}")


# For local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)