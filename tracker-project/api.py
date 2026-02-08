"""
FastAPI Integration for Tracker Identification
-----------------------------------------------
This file provides REST API endpoints for the tracker identification service.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from tracker import TrackerIdentifier
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
    tracker_identifier = TrackerIdentifier()
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
            "trackers": [...],
            "cookies": [...],
            "timestamp": "2024-01-01T12:00:00Z"
        }

        Response:
        {
            "success": true,
            "cookies_inserted": 10,
            "trackers_inserted": 5
        }
    """
    if not snowflake_db:
        raise HTTPException(status_code=503, detail="Database not available")

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

        # Insert trackers
        if request.trackers:
            trackers_inserted = snowflake_db.insert_trackers(
                request.trackers,
                request.email,
                request.deviceId
            )

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
# ENRICHMENT HELPER
# ============================================

def enrich_unknown_trackers():
    """
    Background task: Pull unknown trackers from Snowflake,
    enrich with TrackerIdentifier, and update database
    """
    if not snowflake_db or not tracker_identifier:
        return

    try:
        unenriched = snowflake_db.get_unenriched_trackers(limit=50)

        for tracker in unenriched:
            try:
                result = tracker_identifier.identify(tracker['DOMAIN'])

                if result.get('company') and result['company'] != 'Unknown':
                    snowflake_db.update_enriched_tracker(
                        tracker['ID'],
                        result['company'],
                        result['category']
                    )
            except Exception as e:
                print(f"Error enriching tracker {tracker.get('DOMAIN')}: {e}")

    except Exception as e:
        print(f"Error in enrichment task: {e}")


# For local testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)