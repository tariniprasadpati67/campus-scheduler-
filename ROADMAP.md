# ROADMAP.md: CIT Campus Scheduling Platform

## Project
Web platform for Chilika Institute of Technology: generate weekly timetable
(189 sessions), midsem exams, handle Spectra-week venue bookings, reschedule
after disruptions, and an AI assistant for natural-language requests.
Starter pack: README.md, validator.py, data/cit_public.json, examples/.

## Working rules (agent must follow)
1. Do ONLY the step I name. Stop after it and show how to verify.
2. Never modify validator.py. Never hard-code or hand-edit results.
3. Validity of any schedule/booking is decided by our own code and
   validator.py. An LLM may parse, ask, fill forms and explain, never decide.
4. Every LLM output must pass code validation before it changes data.
5. If the LLM API fails, the manual booking form must still work.
6. Read data from cit_public.json; never hard-code rooms, faculty, etc.
7. Short readable code, type hints, no extra features, no new libraries
   without telling me (they go in THIRD_PARTY.md).
8. Save the prompt I used for each step in prompts/NN-name.md.

## Stack
Python 3.10+, FastAPI, OR-Tools CP-SAT, PostgreSQL, React + Tailwind
(responsive, phone + laptop), deploy on Render/Vercel.

## Time model
Days MON-FRI. Periods 1-9 teaching (P1 08:00 ... P5 12:00, lunch, P6 14:00
... P9 17:00). Periods 10-13 events only. Session with duration d at
start p occupies p..p+d-1, cannot span P5/P6. Labs (3h) start only P2 or P6.

## Hard constraints (each violation = -3 marks)
- Each session scheduled exactly once (day, start period, room)
- No double-booking of faculty, student group, or room
- Combined lectures block every group in them
- Same basket_slot sessions: same day+period, different rooms, no mutual clash
- Room capacity >= session size (exams: half capacity)
- Room type must match; accessible rooms where needed
- Respect faculty unavailability and room unavailability
- No session across lunch; labs only P2-P4 or P6-P8
- Faculty daily limit (max_hours_per_day)
- fixed_slot sessions stay exactly there
- Approved bookings cannot overlap sessions/bookings or clash with
  mandatory groups

## Soft constraints (minimise): S1-S6
Faculty avoid-times, free gaps between classes, >6h/day for a group, two
lectures of same course on one day, room use <40% capacity, P9 usage.

## Booking priority
Exams > Regular classes > Institute events > Guest lectures >
Department events > Club events. Category is capped by role
(role_category_cap). Ties: earlier submitted_at. Never approve cancelled
requests. Nobody approves their own request.

## Steps
Mark [x] when verified with validator.

- [x] Step 1: repo skeleton, .gitignore, .env.example
- [x] Step 2: models.py + load_dataset, validate.py wrapper around validator.py
- [x] Step 3: CP-SAT timetable, hard constraints only.
      Verify: validator shows 0 hard violations for sessions.
- [ ] Step 4: add soft penalties to the objective, lower S1-S6 total.
- [ ] Step 5: midsem exam scheduler (41 exams, half room capacity, an exam
      may use several rooms, slots AM/PM Mon-Sat). Verify: 0 E violations.
- [ ] Step 6: export exports/schedule.json via the app (generated, never edited).
- [ ] Step 7: booking engine for Spectra week: priority rules, role caps,
      cancellations, approve/reject/alternative with a reason each, session
      overrides only for approved institute events. Verify: booking score,
      0 priority inversions.
- [ ] Step 8: reschedule engine: apply disruption file, minimise moved
      sessions (use old schedule as hint), show diff, apply only after Admin
      approval, explain conflicting constraints if infeasible.
      Verify: validator --disruption --baseline.
- [ ] Step 9: export exports/schedule_after.json via the app.
- [ ] Step 10: FastAPI backend, auth with 4 roles (admin, department
      coordinator, faculty, club), permissions, approval flow, reset-demo
      button for Admin, dataset upload.
- [ ] Step 11: AI layer: text/Hinglish -> structured booking JSON, user can
      edit before submit; code validates; faculty assistant for change
      requests; explanations of decisions. Manual form works without LLM.
- [ ] Step 12: React UI: timetable by group/faculty/room, dashboard
      (pending approvals, conflicts, room utilisation), manual scheduling
      that enforces hard constraints, loading/empty/error states, mobile.
- [ ] Step 13: deploy, demo accounts, README (architecture diagram, setup,
      limitations), AI_USAGE.md, THIRD_PARTY.md, final exports, video.

## Verify command
python validator.py --data data/cit_public.json --schedule exports/schedule.json
python validator.py --data data/cit_public.json --schedule exports/schedule_after.json \
  --disruption examples/sample_disruption.json --baseline exports/schedule.json

## Dataset notes
27 rooms, 40 faculty, 14 groups, 189 sessions (243 h), 25 booking requests
(1 cancelled), 41 exams. Baskets: OEB-1..3. No fixed_slot in the base data
but disruptions may add some. Only 2 room_unavailability entries.

