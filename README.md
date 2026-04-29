# BravoBall Coach Frontend

Coach MVP web app for BravoBall.

This repo is a Next.js frontend that talks to the main BravoBall backend in:

- `/Users/jordan/Desktop/bravoball/bravoball/backend`

It is currently scoped to a lightweight coach workflow:

- create teams
- view team join codes
- add players by username or email
- view player roster stats
- inspect per-player completed session history
- view a basic coach dashboard with team totals, top players, and a training breakdown

## Current MVP Status

Implemented:

- `Teams` view
- `Players` view
- `Dashboard` view
- date filters:
  - current week
  - last week
  - current month
  - last month
  - all time
- player detail modal with session and drill history
- coach analytics using existing BravoBall `CompletedSession` data

Not finished yet:

- real coach sign-in / sign-out
- protected coach session shell
- mobile player join-code flow
- multi-manager support
- coach-specific backend role model hardening

## Backend Contract

The frontend expects the BravoBall backend coach endpoints to exist.

Main endpoints used:

- `POST /api/coach/teams`
- `GET /api/coach/teams/me`
- `GET /api/coach/summary`
- `GET /api/coach/teams/{team_id}/members`
- `GET /api/coach/teams/{team_id}/members/{user_id}/sessions`
- `GET /api/coach/dashboard`
- `POST /api/coach/teams/{team_id}/members/by-username`

For local MVP testing, the backend has been run with:

```bash
DEV_COACH_BYPASS_AUTH_ENABLED=true
```

That bypass is only for local development.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

Open:

- `http://localhost:3000`

## Local Backend

Fastest local backend workflow is to run the BravoBall API directly instead of rebuilding Docker on every change:

```bash
cd /Users/jordan/Desktop/bravoball/bravoball/backend
export DATABASE_URL='postgresql://jordan:123@localhost/bravoball'
export DEV_COACH_BYPASS_AUTH_ENABLED=true
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

If you want Docker parity instead:

```bash
cd /Users/jordan/Desktop/bravoball/bravoball
docker build -f backend/Dockerfile -t bravoball-backend backend
docker run -d \
  --name bravoball-backend-local \
  --env-file backend/.env \
  -e DATABASE_URL='postgresql://jordan:123@host.docker.internal/bravoball' \
  -e DEV_COACH_BYPASS_AUTH_ENABLED=true \
  -p 8000:8000 \
  bravoball-backend
```

## Design Notes

- Styling follows the BravoBall landing page direction
- Uses BravoBall mascot/logo assets
- Includes the `Bravo_Panting.riv` asset for future auth/onboarding UI work

## Project Notes

Session summary and checkpoint tracking live here:

- [docs/coach-mvp-checkpoints.md](./docs/coach-mvp-checkpoints.md)

That file is the best handoff doc for continuing the MVP.
