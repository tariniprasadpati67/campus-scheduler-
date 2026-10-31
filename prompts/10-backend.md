Do Step 10 from ROADMAP.md only. Stop after it. If part of it already
exists (test_postgres_startup.py, tables, etc.), keep what works and
finish only what is missing.

STACK: FastAPI + SQLAlchemy + PostgreSQL (Supabase). DATABASE_URL and
JWT_SECRET come from the repo-root .env (python-dotenv, explicit path).
No SQLite fallback. At startup print only "Using PostgreSQL", never the
URL or password. REUSE the existing solver, booking engine and
reschedule engine from Steps 3-9; do not duplicate their logic.

TABLES (create on first start, seed from data/cit_public.json)
- users: id, name, email, password_hash, role (admin | coordinator |
  faculty | club), department, faculty_id (nullable), club_name
  (nullable)
- timetable: session_id, day, start_period, room_id
- booking_requests: id, requester_id, original_text, structured JSON,
  category, status (pending | approved | rejected | alternative_offered
  | cancelled), reason, decided_by, created_at
- change_requests: id, requester_id, type (faculty_leave | room_closed
  | add_session), payload JSON, proposed_diff JSON, status (pending |
  approved | rejected), reason, decided_by
- audit_log: id, actor, action, detail, reason, created_at
Seeding is safe to re-run (does nothing if data exists). Generate the
timetable with our solver on first seed.

AUTH
- POST /auth/login (email + password) -> JWT. GET /auth/me.
- Passwords hashed (bcrypt via passlib or similar).
- Seed 4 demo accounts: admin@cit.test, coordinator@cit.test,
  faculty@cit.test, club@cit.test, with the demo passwords written in
  README.md.
- Role rules: Admin does everything; coordinator requests changes and
  books rooms for own department; faculty views own timetable, marks
  unavailability, requests extra or moved sessions; club submits and
  cancels own venue requests. Nobody can approve their own request.

ENDPOINTS
- timetable by group / faculty / room; room utilisation; current conflicts
- bookings: create (structured JSON) -> our engine decides -> status and
  reason saved; list (role-filtered); cancel own
- faculty unavailability: add / list
- change requests: propose -> minimal-move fix + diff -> pending; Admin
  approve -> apply, reject -> discard; if no fix exists return which
  constraints conflict
- manual scheduling: reject with a reason if any hard constraint breaks
- export schedule.json; Admin POST /admin/reset-demo; Admin dataset upload
- every decision writes a row with a reason into audit_log

RULES
- Every write passes our own validation code before it changes data.
  No LLM in this step.
- CORS for FRONTEND_URL from .env.
- Never print or log secrets. Never edit validator.py or run_all.py.
- Add every new library to THIRD_PARTY.md and new variables to
  .env.example (empty values).

TESTS (backend/tests/): log in as each of the 4 roles; check that a
club user cannot approve; a non-admin cannot reset the demo; a
double-booked room request is blocked with a reason; a self-approval is
refused.

VERIFY
1. Run the tests and python run_all.py; fix any FAIL (max 5 tries, then
   stop and show me the output).
2. Start: cd backend; uvicorn app.api.main:app --reload (adjust the path
   to your main file) and confirm http://localhost:8000/docs opens.
3. Commit "Step 10: backend API, JWT login, PostgreSQL tables".
Reply in 5 lines: the start command and the 4 demo logins.
