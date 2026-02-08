# Privacy Shield - Web Tracker Monitoring & Security Dashboard

**A browser extension + AI-powered dashboard for detecting, analyzing, and blocking web tracking domains.**

## 🎯 What It Does

Privacy Shield monitors tracking domains on the web and provides security insights:

1. **Browser Extension** - Detects trackers in real-time as you browse the web
2. **Analytics Dashboard** - Visualizes tracking data with trends and breakdowns
3. **AI Security Analysis** - Google Gemini API analyzes your browsing data to generate a security score and identify risky websites
4. **Email-Based Data Isolation** - Each user's tracking data is securely isolated by email (Auth0 OAuth)

### Key Features
- **Overview Page** - KPI cards showing total trackers, unique sites, events
- **Trends Page** - Tracker history over 7 days, 30 days, or 6 months
- **Breakdown Page** - Top trackers by initiator/domain, organized by company
- **Security Report** - AI-powered analysis with:
  - Overall security score (0-100)
  - Top 3 least secure websites
  - Per-domain security scoring with reasons
- **Real-time Extension** - Detects and blocks trackers while you browse
- **Blocklist Management** - Add/remove domains from your personal blocklist

## 🚀 Quick Start for Judges

### Prerequisites
- Node.js 16+, Python 3.9+
- Snowflake credentials (provided in `.env`)
- Auth0 credentials (provided in `.env`)
- Google Gemini API key (provided in `.env`)

### Run Locally (3 Commands)

**Terminal 1 - Frontend (React Dashboard):**
```bash
npm install
npm run dev
# Opens http://localhost:5173
```

**Terminal 2 - Backend (FastAPI):**
```bash
cd tracker-project
python -m venv env
source env/bin/activate  # Windows: env\Scripts\activate
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000
```

**Load Extension in Chrome:**
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension/` folder from this repo

### Demo Flow
1. Open the extension popup (click extension icon)
2. Login with any email (uses Auth0 demo account)
3. Open dashboard at `http://localhost:5173/app/overview`
4. See real tracking data from Snowflake
5. Click "Security Report" tab to see AI analysis from Gemini API

## 💡 How It Works

```
Browser Extension  →  FastAPI Backend  →  Snowflake Database
     ↓                     ↓                      ↓
 Detect trackers    Process/store data    Query & aggregate
 Block domains      Enrich with DuckDuckGo  (Email-scoped)
 Sync blocklist     Call Gemini AI
                         ↓
                    React Dashboard
                    (4 pages of insights)
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS + Recharts |
| **Backend** | FastAPI + Python 3.9 |
| **Database** | Snowflake (cloud data warehouse) |
| **Auth** | Auth0 (OAuth2) |
| **AI** | Google Generative AI (Gemini Flash Lite) |
| **Extension** | Chrome Manifest V3 + JavaScript |

## 📊 Dashboard Pages

### Overview
- Total events, unique sites, trackers, cookies (KPI cards)
- 7-day event timeline with real data (filled dots) and demo data (lines)
- Tracker categories by count (bar chart)

### Breakdown
- Top 5 trackers by initiator (table)
- Top 5 trackers by domain (table)
- Company-grouped accordion view
- Full tracker search/filter table

### Trends
- 7-day, 30-day, or 6-month tracking history
- Separate lines for trackers vs cookies
- Dummy data fills gaps for visualization
- Real data marked with filled dots

### Security Report
- **Date Picker** - Select analysis period (default: last 7 days)
- **Security Score** - Ring gauge showing 0-100 score with AI analysis
- **Top 3 Least Secure Sites** - Bar chart of riskiest websites
- **Domain Scores** - All detected domains with individual security scores

## 🔌 API Endpoints (Backend)

All endpoints accept `email` parameter for data filtering:
- `GET /api/overview?email=...` → Overview stats + charts
- `GET /api/trends?email=...&days=7|30|180` → Tracking trends
- `GET /api/breakdown?email=...` → Tracker breakdown
- `GET /api/security-report?email=...&start_date=YYYY-MM-DD` → AI security analysis

## 🗄️ Database

**Snowflake URL_DATA table:**
- Stores detected trackers with domain, company, category, initiator, hit count
- Filtered by `EMAIL_ID` so each user only sees their data
- Automatically enriched with company info via DuckDuckGo tracker database

## 🎨 Design Highlights

- **Cyberpunk Theme** - Dark mode with cyan/green accents
- **Real vs Demo Data** - Filled dots = real data, lines = demo data (for demo purposes)
- **Responsive UI** - Works on desktop browsers
- **Animated Transitions** - Smooth entrance animations for panels

## 🔒 Security & Privacy

- **Email-Scoped Data** - Each user's tracking data isolated by email in Snowflake
- **Auth0 OAuth** - Secure authentication, no passwords stored
- **Client-Side Filtering** - Extension only sends necessary tracker data
- **No Cookie Tracking** - This demo doesn't collect cookies (permission limitations)

## 📁 Project Structure

```
macathon/
├── src/                    # React Dashboard
│   ├── pages/             # 4 main pages (Overview, Breakdown, Trends, Security)
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Auth0 integration
│   └── layout/           # Navigation & header
├── extension/            # Chrome Extension
│   ├── popup/           # Extension popup UI
│   └── manifest.json    # Extension configuration
└── tracker-project/     # FastAPI Backend
    ├── api.py          # REST endpoints + Gemini integration
    ├── snowflake_db.py # Database queries
    └── requirements.txt # Python dependencies
```

## 🎓 What We Built

- ✅ **Full-Stack Application** - Frontend, backend, database, extension
- ✅ **Real Data Integration** - Snowflake cloud database with actual tracking data
- ✅ **AI/ML Component** - Google Gemini API for security analysis
- ✅ **User Authentication** - Auth0 OAuth with email-based data filtering
- ✅ **Browser Extension** - Real-time tracker detection
- ✅ **Data Visualization** - Interactive charts with Recharts
- ✅ **Responsive Design** - Clean, modern UI with Tailwind CSS

## 🎮 Demo Walkthrough

**After startup (npm run dev + python -m uvicorn ...):**

1. **Open Extension** (`chrome://extensions` → Load unpacked → select `extension/`)
2. **Login** - Any email works (demo Auth0 account)
3. **View Dashboard** - http://localhost:5173/app/overview
   - See KPI cards with real Snowflake data
   - 7-day chart with real data points marked as dots
4. **Check Breakdown** - Top trackers by initiator/domain
5. **View Trends** - Switch between 7d/30d/6m views
6. **Try Security Report** - Pick a date, get AI analysis with Gemini API
   - Overall security score
   - Top 3 least secure websites
   - All domains with individual scores

## ✨ Highlights for Judges

- **Multi-layer Architecture** - Extension → API → Snowflake → AI → Dashboard
- **Real Data** - Using actual tracking data from Snowflake database
- **AI Integration** - Google Gemini API analyzes security patterns
- **User Isolation** - Each user only sees their own data via email scoping
- **Professional UX** - Polished dashboard with charts, filters, and navigation
- **Production Ready** - Error handling, loading states, responsive design

## 📝 Configuration Notes

All credentials are in `.env` files (pre-filled for demo):
- **Frontend** - `.env` (Auth0, API URL)
- **Backend** - `tracker-project/.env` (Snowflake, Gemini API key)

No additional setup needed beyond `npm install` + `pip install -r requirements.txt`

---

**Version:** 0.2.0
**Hackathon:** Macathon 2026
**GitHub:** https://github.com/r05200/macathon
