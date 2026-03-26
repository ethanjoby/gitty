# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (`frontend/`)
```bash
npm install        # install deps
npm run dev        # dev server at localhost:5173
npm run build      # type-check + production build
npm run lint       # ESLint
npm run preview    # preview production build
```

### Backend (`backend/`)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && pip install python-dotenv
playwright install chromium
uvicorn main:app --reload --port 8000
```

Backend `.env`:
```
ANTHROPIC_API_KEY=required
GITHUB_TOKEN=recommended
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # optional
BROWSERBASE_WS_ENDPOINT=wss://...           # optional
```

## Architecture

Two independent services:

**`frontend/`** — React 19 + TypeScript SPA, no backend dependency for most features. All routes are in `src/main.tsx`. Auth and data live in Firebase (Auth + Firestore); supplemental state is persisted to `localStorage` (GitHub token, resume as data URL, user settings).

Two parallel user flows:
- **Engineer**: GitHub OAuth (`GithubAuthProvider`) → onboarding → `/dashboard`
- **Company**: Google OAuth (`GoogleAuthProvider`) → onboarding → `/company/dashboard`

`Dashboard.tsx` and `CompanyDashboard.tsx` are large monolithic components (~3,500 and ~1,500 lines). Tabs within each are rendered inline via conditional logic, not separate route files.

**`backend/`** — Single-file FastAPI service (`main.py`). `POST /evaluate` fetches GitHub issue/PR context (capped: 20 comments, 10 files, 8KB excerpts), optionally crawls rendered pages via Browserbase, then sends a structured prompt to Claude and returns a scored JSON evaluation.

## Engineering Philosophy

- **Prefer minimal surface area.** Don't introduce abstractions, utilities, or helpers for things used once. Inline is fine.
- **Don't refactor what wasn't touched.** Changes should be scoped to exactly what was asked.
- **Keep code extremely modular** Thinking more to end up with less code in the end is always better.
- **Always plan out** Much better to use more compute to plan things out super well than to have to go back and fix sloppy code later

