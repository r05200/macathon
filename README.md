# Privacy Shield - Tracker Monitoring Dashboard

A comprehensive browser extension and web dashboard for monitoring and blocking tracking domains, with AI-powered security analysis using Google Gemini API.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- Snowflake account with URL tracking database access
- Auth0 account for authentication
- Google Gemini API key (free tier available)

### 5-Minute Setup

**Frontend:**
```bash
npm install
npm run dev
# Dashboard runs on http://localhost:5173
```

**Backend:**
```bash
cd tracker-project
python -m venv env
source env/bin/activate  # Windows: env\Scripts\activate
pip install -r requirements.txt
python -m uvicorn api:app --reload --port 8000
# API runs on http://localhost:8000
```

**Extension:**
- Go to `chrome://extensions`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `extension/` folder

## 📁 Project Structure

```
macathon/
├── src/                        # Frontend Dashboard (React + TypeScript)
│   ├── pages/
│   │   ├── Overview.tsx        # Stats & 7-day trends
│   │   ├── Trends.tsx          # 7d/30d/6m tracking history
│   │   ├── Trackers.tsx        # Tracker breakdown by domain/company
│   │   └── SecurityReport.tsx  # AI security analysis & scoring
│   ├── components/             # Reusable UI components
│   ├── hooks/useUserEmail.ts   # Auth0 integration
│   ├── layout/AppShell.tsx     # Navigation & header
│   └── index.css               # Tailwind + custom cyberpunk theme
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── popup/                  # Popup UI & logic
│   ├── background/             # Service worker
│   └── manifest.json
├── tracker-project/            # FastAPI Backend (Python)
│   ├── api.py                  # REST endpoints & Gemini integration
│   ├── snowflake_db.py         # Snowflake queries
│   ├── tracker.py              # Tracker identification
│   ├── requirements.txt
│   └── .env                    # Configuration
└── README.md / .gitignore      # This file & git config
```

## ⚙️ Configuration

### Frontend (.env)
```env
VITE_AUTH0_DOMAIN=your-tenant.ca.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH_DISABLED=false
VITE_API_URL=http://localhost:8000
```

### Backend (tracker-project/.env)
```env
SNOWFLAKE_USER=your-username
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
GEMINI_API_KEY=AIzaSy...  # Get from https://aistudio.google.com/app/apikey
```

## 🎯 Features

### Dashboard
- **Overview** - KPI cards, 7-day event timeline, tracker categories
- **Breakdown** - Top trackers by initiator/domain, company groups
- **Trends** - Tracking history (7 days, 30 days, 6 months) with dummy data fill
- **Security Report** - AI-powered analysis:
  - Overall security score (0-100)
  - Top 3 least secure websites
  - Per-domain security scoring

### Extension
- Real-time tracker detection on every webpage
- Email-based data filtering (OAuth2 with Auth0)
- Integration with dashboard for viewing blocked trackers
- Blocklist management

### Data Pipeline
1. Extension detects trackers → 2. Sends to API → 3. Stored in Snowflake → 4. Enriched with DuckDuckGo DB → 5. Analyzed by Gemini AI → 6. Displayed in dashboard

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + Python 3.9+ |
| Database | Snowflake (cloud data warehouse) |
| Auth | Auth0 (OAuth2) |
| AI | Google Generative AI (Gemini Flash Lite) |
| Visualization | Recharts |
| Extension | Chrome Manifest V3 + Vanilla JS |

## 📡 API Endpoints

### Dashboard Endpoints
```
GET /api/overview?email=user@example.com
  → Overview stats + 7-day breakdown

GET /api/trends?email=...&days=7|30|180
  → Tracker trends with dummy data fill

GET /api/breakdown?email=...
  → Top trackers, company groups, all trackers

GET /api/security-report?email=...&start_date=2026-02-01
  → AI security analysis with Gemini API
```

### Tracker Identification
```
POST /identify → Identify single domain
POST /identify/batch → Identify multiple domains
```

### Extension API
```
POST /api/trackers → Upload tracker data
GET /api/blocklist?email=... → Fetch user blocklist
POST /api/blocklist → Add domain to blocklist
```

## 🗄️ Database Schema

### URL_DATA (Snowflake)
Key fields for email-based filtering:
- `EMAIL_ID` - User email (for data scoping)
- `DOMAIN_NAME` - Tracker domain
- `INITIATOR` - Website containing the tracker
- `COMPANY` - Company owning tracker (enriched)
- `CATEGORY` - Type: advertising, analytics, tracking, social, etc.
- `OCCURRENCES` - Hit count
- `CREATED_AT` - Timestamp

## 🚨 Known Issues & Limitations

1. **Loading stuck after login** - Fixed! Auth0 callback now cleans URL params
2. **Gemini quota exceeded** - Using `gemini-flash-lite-latest` (better free tier limits)
3. **Cookie tracking** - Requires elevated Snowflake permissions (read-only for now)
4. **Real data only** - KPI cards show only real data; graphs fill gaps with dummy data for demo

## 🔧 Troubleshooting

### "Loading..." freezes after Auth0 login
→ Clear browser cache, check `.env` Auth0 credentials, verify redirect URI

### Gemini API errors (429 Quota Exceeded)
→ Already using Flash Lite (higher quota). Wait 1 hour for reset or enable billing

### Snowflake connection refused
→ Verify credentials in `.env`, check firewall/network, confirm account ID format

### node_modules issues
→ `node_modules/` is NOT in git. Run `npm install` after cloning

## 📝 Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Commit changes
git commit -m "description"

# Push to remote
git push origin feature/your-feature

# Create PR on GitHub
```

**Note:** `main` branch is protected. All changes require PR review.

## 👥 Team Notes

- Frontend runs on port **5173** (Vite)
- Backend runs on port **8000** (FastAPI)
- Extension: Load unpacked from `extension/` folder
- Auth0 handles user authentication; email is scoped to Snowflake queries
- Gemini API analyzes tracker data for security reports
- Dashboard shows real data with smart dummy-data filling for visualization

## 📚 Development Commands

```bash
# Frontend
npm run dev        # Start dev server
npm run build      # Production build
npm run preview    # Preview build
npm run lint       # Type check

# Backend
python -m uvicorn api:app --reload       # Start with auto-reload
python -m pytest                         # Run tests (if any)

# Git
git log --oneline  # View commits
git status         # Check working tree
git push origin main  # Push to remote
```

## 🎨 Styling

Dashboard uses cyberpunk-themed Tailwind CSS with custom variables:
- `--cyber-bg`: Dark background
- `--cyber-accent`: Cyan accent color
- `--cyber-accent-green`: Green accent
- `--cyber-danger`: Red/danger color
- `--cyber-border`: Subtle border color

Charts use Recharts with custom dot rendering to show "Real Data" (filled dots) vs "Demo Data" (line only).

## 📧 Support

For questions or issues:
1. Check this README first
2. Open a GitHub issue
3. Contact the team

---

**Version:** 0.2.0
**Last Updated:** February 2026
