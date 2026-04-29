# Coach MVP Checkpoints

## Goal
Ship the `Teams` flow first with real BravoBall backend data, then expand into `Players` and `Dashboard`.

## Checkpoint 1: Frontend/Backend Connectivity
Status: Complete

### Scope
- Connect `bravoball-coach-frontend` to the local BravoBall backend
- Use a backend-only local auth bypass flag for coach routes during MVP testing
- Load real teams from `GET /api/coach/teams/me`
- Create a real team with `POST /api/coach/teams`

### Success Conditions
- The page can reach the backend from `http://localhost:3000`
- `Load teams` returns either a real empty state or persisted teams
- `Create team` inserts a row in the backend and updates the UI
- Refreshing the page still shows the newly created team

### Out of Scope
- Add player by username
- Roster/activity queries
- Managers and players pages
- Real weekly metrics

## Checkpoint 2: Team Membership
Status: Complete

### Scope
- Add player by username
- View selected team
- Show join code
- Fetch roster for selected team

### Success Conditions
- Coach can add an existing BravoBall user by username
- Roster refresh shows the added player
- Team selection persists for the current page session

## Checkpoint 3: Replace Template Metrics
Status: Complete

### Scope
- Replace static values with real backend data
- Add date filtering for:
  - current week
  - last week
  - current month
  - last month
  - all time
- Show filtered values directly in the top teams table:
  - registration
  - avg time per player
  - trained in selected range

### Notes
- `CompletedSession.date` is currently the usable completion-time field
- Filtered team metrics are now driven off the real backend
- Local test data was backfilled to prove the table behavior

## Checkpoint 4: Session Analytics Foundation
Status: Deferred

### Scope
- Audit `CompletedSession` timestamps
- Confirm the correct completion-time field
- Add indexes needed for coach metrics

### Decision
- Timestamp audit is effectively done for MVP:
  - use `CompletedSession.date`
- Do not add indexes yet
- Revisit indexing after MVP usage proves the query path needs it

### Future Scale Note
- The current filter-by-timestamp approach is acceptable for MVP
- If needed later, add indexes such as:
  - `(user_id, date)`
  - possibly `(date)`
- We do not need aggregation tables before proving coach usage

## Checkpoint 5: UI Cleanup
Status: Complete

### Scope
- Simplify the left nav to:
  - Teams
  - Players
  - Dashboard
- Remove non-MVP sections such as:
  - Training Library
  - Leaderboards
  - Skill Tests
  - Activity
- Keep the teams page focused on:
  - creating teams
  - adding players
  - filtered team metrics

## Data Model Note
- Current MVP uses a single coach owner on `Team`
- This is acceptable for now
- When multi-manager support is needed, add a join table such as `team_managers`
- Do not add a separate coaches table yet unless auth and org onboarding require it

## Session Summary
The following is already finished in the current MVP build.

### Frontend
- New coach frontend app in `bravoball-coach-frontend`
- BravoBall-styled shell with:
  - top header
  - left nav
  - teams page
  - players page
  - dashboard page
- Date filter supports:
  - current week
  - last week
  - current month
  - last month
  - all time
- Teams page shows:
  - team name
  - join code
  - registration count
  - avg time per player
  - trained minutes in selected range
- Players page shows, per selected team member:
  - total trained
  - technical minutes
  - physical minutes
  - mental minutes
  - current streak
  - best streak
- Technical and Physical columns have hover help:
  - Technical = passing, shooting, dribbling, first touch, goalkeeping
  - Physical = defending, fitness
- Clicking a player opens detail history for the selected range:
  - sessions completed
  - session dates
  - drill names
  - skill/sub-skill metadata
  - session time breakdown
- Dashboard page shows:
  - active players
  - total players
  - total time logged
  - top training players
  - category breakdown pie chart

### Backend
- Coach/team APIs live in the BravoBall backend
- Current coach MVP endpoints include:
  - `POST /api/coach/teams`
  - `GET /api/coach/teams/me`
  - `GET /api/coach/summary`
  - `GET /api/coach/teams/{team_id}/members`
  - `GET /api/coach/teams/{team_id}/members/{user_id}/sessions`
  - `GET /api/coach/dashboard`
  - `POST /api/coach/teams/{team_id}/members/by-username`
  - `POST /api/team/join`
  - `POST /api/team/leave`
  - `GET /api/team/me`
- Add-player lookup supports:
  - username
  - email
- Team/player/dashboard metrics are derived from existing `CompletedSession.date`
- Physical minutes currently map to:
  - `fitness`
  - `defending`
- Technical minutes currently map to:
  - passing
  - shooting
  - dribbling
  - first touch
  - goalkeeping
  - other non-mental, non-physical drill skills

### Local MVP test setup
- Local coach testing used:
  - `DEV_COACH_BYPASS_AUTH_ENABLED=true`
- Local Postgres test data was backfilled so the coach UI shows:
  - real-looking completed sessions
  - real drill names
  - real time totals
  - non-zero current-month/current-week metrics

### Important notes
- `CompletedSession.date` is the current reporting timestamp for coach analytics
- No index work has been done yet
- No dedicated coach auth/login has been finished yet
- No manager multi-owner model yet; `Team` currently has one coach owner
- No player join-code flow has been added to the mobile app yet

## Next Implementation Order
1. Add mobile-side join-team flow for players
2. Revisit whether coaches should stay as `User` + role or move to a separate profile layer
3. Add multi-manager support later with a join table such as `team_managers`
4. Revisit indexing after real coach usage proves the hot queries

## Checkpoint 6: Coach Auth Shell
Status: Complete

### Scope
- Add real coach sign-up and sign-in against the BravoBall backend
- Protect the coach frontend with an auth wrapper
- Keep coaches in the existing `users` table for MVP using the `role` field
- Reuse the landing-page `Bravo_Panting.riv` mascot animation on the login page

### Success Conditions
- A coach can create an account from the coach frontend
- The backend persists that account as a BravoBall user with `role = "coach"`
- Signed-in coaches land in the protected teams/players/dashboard shell
- Refreshing the page restores the session locally
- Expired access tokens retry through refresh token flow before forcing a new sign-in
