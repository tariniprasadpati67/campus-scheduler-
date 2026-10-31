# Step 3b: Read-Only Viewer

## Prompt
```text
Build a small read-only viewer in frontend/ (React 18 + Vite + Tailwind
CSS, plain JavaScript, no TypeScript). Do NOT touch backend/, validator.py,
run_all.py or run_all.bat.

DATA
- Copy exports/schedule.json and data/cit_public.json into
  frontend/public/data/ with a small script (npm run sync-data) so the
  viewer always shows what the app generated. Never edit the JSON.
- schedule.json has sessions (session_id, day, start_period, room_id),
  exams and fest_week bookings. cit_public.json has rooms, faculty,
  groups, courses and session details (use it to show course names,
  faculty names, group names, duration).

SCREENS (single page, tabs on top)
1. Timetable: a dropdown to choose "Student group", "Faculty" or "Room",
   then a second dropdown for the item. Grid with MON-FRI as columns and
   P1-P9 as rows, with the time (08:00 ... 17:00) on the left and a
   visible lunch row between P5 and P6. Each cell shows course, room and
   faculty (or group, depending on the view). Colour by lecture /
   tutorial / lab. A 3-hour lab spans 3 rows. Clicking a cell opens a
   small detail panel (session id, course, faculty, groups, room, size).
2. Exams: list of midsem exams with day, slot, rooms and groups.
3. Bookings: Spectra week requests with status (approved / alternative /
   rejected) and the reason text for each.

UI RULES
- Responsive: works on a phone (grid scrolls sideways, sticky time column)
  and on a laptop.
- Consistent spacing and colours, readable fonts, light and dark safe.
- Loading, empty and error states (for example when the JSON is missing,
  show a clear message).
- No business logic, no validity checks: display only.

VERIFY
1. npm install, npm run sync-data, npm run build must pass.
2. npm run dev must open and show the timetable for the first group.
3. List every new npm package in THIRD_PARTY.md.
4. Save this prompt in prompts/03b-viewer.md, tick nothing in ROADMAP.md,
   commit "Step 3b: read-only viewer".

Reply in 5 lines and tell me the exact command to open the viewer.
```
