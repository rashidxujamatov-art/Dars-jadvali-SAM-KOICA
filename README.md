# TEST DARS JADVALI MVP

Monorepo with:
- `backend`: Express + Prisma + SQLite + scheduling engine + PDF export
- `frontend`: React (Vite) + Tailwind timetable management UI

## Run
1. Install dependencies
2. `cd backend && npx prisma migrate dev --name init`
3. `npm run dev` from repo root

## Key Features
- Strict scheduling constraints with standardized error codes
- CRUD for Groups, Teachers, Subjects, Blocked days, Holidays
- Multi-week grid view with conflict highlighting
- Holiday shift + affected subject re-scheduling
- Per-group PDF export
