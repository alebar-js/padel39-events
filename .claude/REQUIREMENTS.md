# Product Requirements Document (PRD): Tournament Management Dashboard

**Version:** 3.0
**Last Updated:** April 21, 2026

**Objective:**
A full-stack Next.js application for padel club organizers to run tournaments end-to-end — from creating the draw to entering scores live on the day. Participants get a lightweight read-only public page (accessible via QR) to look up their schedule. Admin tooling ships first; participant-facing features come after the organizer workflow is solid.

**Core Formats Supported:**
1. Single Elimination + Consolation Bracket (back draw for first-round losers).
2. Group Stage → Playoffs (no back draw).

**User Roles:**
- **Administrator** — Authenticated via Google OAuth. Full CRUD on tournaments, divisions, participants, brackets, and order of play. Accessed via a hidden sign-in URL (not linked publicly).
- **Participant / Spectator** — Unauthenticated. Read-only access via the public landing page or a direct tournament link.

---

## Milestone 1: Foundation, Auth & Database
*Goal: Running skeleton — can sign in, see an empty dashboard, data persists.*

* **Project Setup:** Next.js App Router, Tailwind CSS, TypeScript.
* **Database:** MongoDB. Mongoose ODM for models and queries.
* **Authentication (NextAuth.js + Google OAuth):**
    * Sign-in page at `/admin/sign-in` — not linked from anywhere public.
    * Middleware protects all `/admin/*` routes; unauthenticated → redirect to sign-in.
    * Public routes (`/`, `/t/[slug]`) require no auth.
    * Sessions stored via NextAuth database adapter.
* **Data Models:**
    * **User:** `id`, `email`, `name`, `image` — NextAuth adapter tables.
    * **Tournament:** `id`, `name`, `startDate`, `endDate`, `slug` (unique, URL-safe), `status` (`LIVE` | `DRAFT` | `SCHEDULED` | `DONE`), `venue`, `createdByUserId`.
    * **Division:** `id`, `tournamentId`, `name`, `format` (`SINGLE_ELIM_CONSOLATION` | `GROUP_PLAYOFF`), `matchFormat` (`ONE_SET` | `BEST_OF_3`, default `BEST_OF_3`).
    * **Team:** `id`, `divisionId`, `player1`, `player2`, `seed` (nullable int).
    * **Court:** `id`, `tournamentId`, `name` (e.g. "Court 1"), `order` (for display sorting).
    * **TournamentDay:** `id`, `tournamentId`, `date`, `startTime`, `endTime`, `slotMinutes` (default 90), `courtIds` (array of court IDs for that day).
    * **Match:** `id`, `divisionId`, `round` (string label e.g. `"QF"`), `bracketSlot` (nullable int; binary-tree position — 1 = Final, 2–3 = SF, 4–7 = QF, etc.), `team1Id`, `team2Id`, `winnerId` (nullable), `sets` (array of `{team1: int, team2: int}` — one entry per set played), `isConsolation` (boolean), `courtId` (nullable ref to Court), `scheduledTime` (nullable timestamp), `orderPosition` (nullable int).

---

## Milestone 2: Admin Dashboard & Tournament CRUD
*Goal: Organizer can create and manage tournaments through the UI.*

* **Admin Dashboard (`/admin`):** Lists all tournaments for the signed-in user. Status chips, dates, division/team counts. Cards view default; table view toggle.
* **New Tournament Wizard (`/admin/new`):** Step 1 collects name, dates, venue, slug. Steps 2–3 add divisions and seed teams. Step 4 review + publish.
* **Tournament Detail (`/admin/t/[slug]`):** Edit header info, manage divisions, manage team roster per division (quick-add + bulk paste), set format per division.
* **Delete / Archive:** Soft-delete tournaments (set status `DONE`) or hard-delete from dashboard.

---

## Milestone 3: Match Generation Engine
*Goal: One click turns a seeded roster into an empty bracket.*

* **Single Elim + Consolation:**
    * Build a power-of-2 bracket with bye insertion for non-power-of-2 counts.
    * Generate consolation bracket slots; auto-populate when a team loses their first match.
* **Groups + Playoffs:**
    * Divide teams into N groups of M, generate round-robin match list per group.
    * After all group matches, seed top finishers into a playoff bracket.
* API route: `POST /api/admin/divisions/[id]/generate` — idempotent, warns if matches already exist.

---

## Milestone 4: The "Cuadro" — Bracket Visualization & Score Entry
*Goal: Organizer can run the tournament live — enter scores, advance winners.*

* **Bracket View (`/admin/t/[slug]/d/[divisionId]/bracket`):**
    * Visual tree: columns = rounds, nodes = matches with team names + score.
    * Admin: click any match node → inline score entry form → confirm → winner advances automatically.
    * Consolation bracket rendered below or beside main draw.
* **Groups view:** Table of round-robin results per group with auto-computed standings.
* All mutations verify admin session server-side.

---

## Milestone 5: Order of Play Editor
*Goal: Organizer can schedule which matches play when and on which court.*

* **Editor (`/admin/t/[slug]/schedule`):**
    * Grid-based interface with courts as columns and time slots as rows.
    * Click empty cells to assign unscheduled matches; click scheduled matches to view details or remove.
    * Persist `courtId` (ref to Court) and `scheduledTime` (timestamp) per match.
    * Automatic court creation (4 default courts) and time slot generation (90-min slots from 9:00-22:00).
    * Conflict detection prevents double-booking same court/time slot.
* **Quick schedule view:** Visual grid showing all matches by court and time, with unscheduled matches panel.

---

## Milestone 6: Public Participant Experience
*Goal: Players can look up their schedule on their phone via QR.*

* **Public Tournament Page (`/t/[slug]`):**
    * Mobile-first. No auth.
    * Participant name search → auto-complete across all teams in the tournament.
    * On selection: next match (opponent, court, time), full schedule, match history.
    * Persist selected name in `localStorage`.
* **QR Code:** Admin tournament page renders a printable QR encoding the public URL.
* **Public Landing Page (`/`):** Simple list of `LIVE` tournaments, each linking to `/t/[slug]`. No admin controls, no sign-in link.

---

## Milestone 7: Deployment & Hardening
*Goal: Ship to production.*

* **Deploy to Vercel.** Configure Google OAuth, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `MONGODB_URI`.
* **Edge cases:**
    * Bracket generation with uneven team counts (bye logic).
    * Admin routes fully inaccessible when signed out.
    * Public page loads fast on mobile, scopes data to the correct tournament.
    * Order of play changes visible to participants after page refresh.

---

## Deprioritized / Deferred

* Real-time bracket/order-of-play updates (polling or websockets) — static refresh is fine for MVP.
* Fancy public landing page — intentionally stays a plain list of live tournaments.
* Multi-admin / team sharing — single organizer per tournament for now.
* Email/SMS notifications to participants.
