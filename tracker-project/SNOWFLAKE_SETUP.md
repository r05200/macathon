# Snowflake Database Connection Verification Guide

This guide explains how to verify that your FastAPI backend is correctly connected to your Snowflake database and how your frontend connects through the API.

## Connection Architecture

```
Frontend (Browser)
    ↓
FastAPI Server (localhost:8000)
    ↓
snowflake_db.py (Python Connector)
    ↓
Snowflake Cloud Database
    └── Database: url_tracking_db
        └── Schema: tracking
            ├── Table: cookies_data
            ├── Table: trackers_data
            └── Table: blocklist
```

**Important**: The frontend does NOT connect directly to Snowflake. It makes HTTP requests to your FastAPI backend, which then queries Snowflake using the Python connector.

---

## Step 1: Verify Environment Variables

Your Snowflake credentials are stored in `.env` file. This file should be in the `tracker-project/` directory.

### Check `.env` file exists:

```bash
cd /Users/atula/macathon/tracker-project
ls -la .env
```

If the file doesn't exist, create it from the template:

```bash
cp .env.example .env
```

### Edit `.env` with your Snowflake credentials:

```bash
# Open in your editor
nano .env
# or
code .env
```

The file should contain:

```env
SNOWFLAKE_USER=your_actual_username
SNOWFLAKE_PASSWORD=your_actual_password
SNOWFLAKE_ACCOUNT=your_account_identifier

# Example:
# SNOWFLAKE_USER=john_doe
# SNOWFLAKE_PASSWORD=MySecurePassword123
# SNOWFLAKE_ACCOUNT=ab12345.us-east-1
```

**Find your account identifier**:
- Log into Snowflake web UI
- Look at the URL: `https://<ACCOUNT_IDENTIFIER>.snowflakecomputing.com`
- Use the `<ACCOUNT_IDENTIFIER>` part (e.g., `ab12345.us-east-1`)

---

## Step 2: Verify Python Database Configuration

Open [snowflake_db.py](snowflake_db.py) and check the connection parameters:

```python
def __init__(self):
    self.conn_params = {
        'user': os.getenv('SNOWFLAKE_USER'),
        'password': os.getenv('SNOWFLAKE_PASSWORD'),
        'account': os.getenv('SNOWFLAKE_ACCOUNT'),
        'warehouse': 'COMPUTE_WH',           # ← Verify this warehouse exists
        'database': 'url_tracking_db',       # ← Verify this database exists
        'schema': 'tracking'                  # ← Verify this schema exists
    }
```

**Make sure these match your Snowflake setup:**
- Warehouse name: `COMPUTE_WH` (or change to your warehouse name)
- Database name: `url_tracking_db`
- Schema name: `tracking`

---

## Step 3: Test Snowflake Connection from Python

Run this command to test the connection:

```bash
cd /Users/atula/macathon/tracker-project
python3 -c "from snowflake_db import SnowflakeDB; db = SnowflakeDB(); print('✅ Connection successful')"
```

**Expected output:**
```
✅ Snowflake connection successful
✅ Connection successful
```

**If you see errors:**
- `ProgrammingError: 250001`: Invalid username/password
- `ProgrammingError: 002003`: Database/schema doesn't exist
- `ProgrammingError: 002043`: Warehouse doesn't exist or not running
- `ForbiddenError: 390144`: Account identifier is wrong

---

## Step 4: Verify Tables Exist in Snowflake

Log into Snowflake web UI and run these SQL queries:

### Check database and schema exist:

```sql
-- List all databases
SHOW DATABASES LIKE 'url_tracking_db';

-- Use the database
USE DATABASE url_tracking_db;

-- List all schemas
SHOW SCHEMAS LIKE 'tracking';

-- Use the schema
USE SCHEMA tracking;
```

### Check tables exist:

```sql
-- List all tables in the schema
SHOW TABLES;

-- Should show:
-- cookies_data
-- trackers_data
-- blocklist
```

### Verify table structure:

```sql
-- Check cookies_data table structure
DESCRIBE TABLE cookies_data;

-- Check if there's any data
SELECT COUNT(*) as total_cookies FROM cookies_data;

-- View sample data
SELECT
    id,
    cookie_name,
    domain_name,
    company,
    category,
    is_tracker,
    is_third_party,
    detected_at
FROM cookies_data
LIMIT 10;
```

### Check user's data:

```sql
-- Replace with your actual email
SELECT COUNT(*) as my_cookies
FROM cookies_data
WHERE user_email = 'user@example.com';

-- View your cookies
SELECT * FROM cookies_data
WHERE user_email = 'user@example.com'
ORDER BY detected_at DESC
LIMIT 20;
```

---

## Step 5: Start and Test the API Server

### Install Python dependencies:

```bash
cd /Users/atula/macathon/tracker-project
pip3 install -r requirements.txt
```

### Start the FastAPI server:

```bash
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
✓ Tracker database loaded successfully
✅ Snowflake connection successful
✓ Snowflake connection established
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**If Snowflake connection fails:**
- You'll see: `⚠️  Snowflake connection failed: <error message>`
- The API will still run but database features won't work
- Check your `.env` file and Snowflake credentials

### Test API health endpoint:

Open a new terminal and run:

```bash
curl http://localhost:8000/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

If `"database": "disconnected"`, your API is running but Snowflake connection failed.

---

## Step 6: Test API Endpoints

### Test cookies endpoint:

```bash
# Replace with your actual email
curl "http://localhost:8000/api/cookies?email=user@example.com&limit=10"
```

**Expected response:**
```json
{
  "cookies": [
    {
      "ID": 1,
      "COOKIE_NAME": "_ga",
      "DOMAIN_NAME": "google-analytics.com",
      "COMPANY": "Google",
      "CATEGORY": "Analytics",
      "IS_TRACKER": true,
      "IS_THIRD_PARTY": true,
      "IS_PERSISTENT": true,
      "EXPIRATION_DATE": "2025-12-31T00:00:00",
      "PAGE_URL": "https://example.com",
      "USER_EMAIL": "user@example.com",
      "DETECTED_AT": "2024-01-15T10:30:00"
    }
  ],
  "stats": {
    "TOTAL_COOKIES": 50,
    "THIRD_PARTY_COUNT": 35,
    "TRACKER_COUNT": 28,
    "PERSISTENT_COUNT": 40
  }
}
```

### Test trackers endpoint:

```bash
curl "http://localhost:8000/api/trackers/history?email=user@example.com&limit=10"
```

### Test blocklist endpoint:

```bash
curl "http://localhost:8000/api/blocklist?email=user@example.com"
```

**Expected response:**
```json
{
  "domains": [
    "doubleclick.net",
    "facebook.net",
    "ads.twitter.com"
  ]
}
```

---

## Step 7: Test Frontend Connection

### Open the example dashboard:

```bash
cd /Users/atula/macathon/dashboard
open example.html
# or open in your browser manually
```

### Check browser console:

1. Open browser DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. You should see API calls being made
4. Check Network tab to see HTTP requests to `http://localhost:8000`

### Verify data matches Snowflake:

Compare the data shown in the frontend with what you see in Snowflake:

```sql
-- Run this in Snowflake
SELECT cookie_name, domain_name, company, category
FROM cookies_data
WHERE user_email = 'your_email@example.com'
ORDER BY detected_at DESC
LIMIT 20;
```

The data should match what appears in your frontend dashboard.

---

## Troubleshooting

### Problem: "Database not available" error

**Solution:**
1. Check `.env` file has correct credentials
2. Verify Snowflake warehouse is running:
   ```sql
   -- In Snowflake web UI
   SHOW WAREHOUSES;
   ALTER WAREHOUSE COMPUTE_WH RESUME;
   ```
3. Restart the API server

### Problem: Empty data in frontend

**Possible causes:**
1. No data in Snowflake for that email address
2. Extension hasn't uploaded data yet
3. Wrong email entered

**Check in Snowflake:**
```sql
-- See which users have data
SELECT user_email, COUNT(*) as cookie_count
FROM cookies_data
GROUP BY user_email;
```

### Problem: CORS errors in browser console

**Solution:**
The API already has CORS enabled in [api.py](api.py):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If you still see CORS errors, make sure you're running the API server.

### Problem: Connection timeout

**Check Snowflake account status:**
- Log into Snowflake web UI
- Go to Activity → Query History
- See if queries are being received and executed

**Check network connectivity:**
```bash
# Test if you can reach Snowflake
ping your-account.snowflakecomputing.com
```

---

## Verification Checklist

- [ ] `.env` file exists with correct credentials
- [ ] `python3 -c "from snowflake_db import SnowflakeDB; SnowflakeDB()"` succeeds
- [ ] Snowflake tables exist and contain data
- [ ] API server starts without errors
- [ ] `curl http://localhost:8000/api/health` returns `"database": "connected"`
- [ ] `curl http://localhost:8000/api/cookies?email=YOUR_EMAIL` returns data
- [ ] Frontend can fetch and display data from API
- [ ] Data in frontend matches data in Snowflake

---

## Production Deployment Notes

When deploying to production:

1. **Change API_URL** in `dashboard/api-client.js`:
   ```javascript
   const API_URL = 'https://your-api-domain.com';
   ```

2. **Update CORS settings** in `api.py` to restrict origins:
   ```python
   allow_origins=["https://your-frontend-domain.com"],
   ```

3. **Use environment variables** for Snowflake credentials (don't commit `.env`)

4. **Enable HTTPS** for your API server

5. **Set up proper authentication** (API keys, OAuth, etc.)
