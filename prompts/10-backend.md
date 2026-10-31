Do Step 10 from ROADMAP.md only. Stop after it.

Build a FastAPI backend in backend/app/api/ that REUSES the existing
solver, booking engine and reschedule engine (Steps 3-9). Do not
duplicate that logic. Read .env with python-dotenv.

DATABASE
- SQLAlchemy. DATABASE_URL from .env (Supabase PostgreSQL). If it is
  empty, fall back to sqlite:///./cit.db.
- Tables: users, timetable, booking_requests, change_requests,
  audit_log. Passwords are hashed.
- On first start, create tables, seed from data/cit_public.json, and
  generate the timetable with our solver.

AUTH
- JWT login with our own users table (no Supabase Auth). JWT_SECRET
  from .env.
- Seed 4 demo accounts: admin, department coordinator, faculty, club
  representative. Put the logins in the README.
- Permissions follow the problem statement roles. Nobody can approve
  their own request.

ENDPOINTS
- login, who am I
- timetable by group / faculty / room; room utilisation; current
  conflicts
- create booking (structured JSON from the manual form) -> our engine
  decides -> status + reason saved; list and cancel bookings
- faculty marks unavailability
- propose a change (faculty leave, room closed, new session) ->
  minimal-move fix + diff -> status pending; Admin approves or rejects;
  apply ONLY after approval; if no valid fix, return which constraints
  conflict
- manual scheduling: rejected with a reason if it breaks any hard
  constraint
- export schedule.json; Admin reset-demo-data; Admin dataset upload
- every decision writes a reason to audit_log

RULES
- Every write passes our own validation code before it changes data.
  No LLM is involved in this step.
- CORS for the frontend origin from .env.
- Never print or log DATABASE_URL or passwords.
- Add backend/tests/ that log in as each role, check permissions, and
  check one blocked conflict.

VERIFY
1. Run the tests and python run_all.py. Fix any FAIL (max 5 tries,
   then stop and show me the full output).
2. Start the server (uvicorn) and confirm http://localhost:8000/docs
   opens.
3. Add new libraries to THIRD_PARTY.md and new variables to
   .env.example (empty values).
4. Save this prompt in prompts/10-backend.md, tick Step 10 in
   ROADMAP.md, commit "Step 10: backend API and database".
Never edit validator.py or run_all.py.

Reply in 5 lines: the command to start the server and the 4 demo logins.

