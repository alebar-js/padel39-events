# Participant Experience — PRD

## Overview

A read-only, mobile-first tournament view for participants and spectators. Accessible at `/t/[slug]` (tournament landing) and `/t/[slug]/d/[divisionId]` (division detail). No authentication required.

---

## Goals

1. Participants can find their tournament and see all divisions at a glance.
2. Within a division, they can navigate between stages (group stage ↔ playoff, main draw ↔ back draw).
3. Everything is read-only — no score entry, no admin controls.
4. Works well on mobile (primary use case: checking results courtside on a phone).

---

## Routes

| Path | Purpose |
|---|---|
| `/t/[slug]` | Tournament landing — lists all divisions with status chips |
| `/t/[slug]/d/[divisionId]` | Division detail — full stage/draw view |

---

## Tournament Landing (`/t/[slug]`)

### Current state
Shows a `TournamentDetailView` component. It currently does not fetch divisions or link to division pages.

### Required changes

**Header**
- Tournament name (serif, large)
- Venue · date range · status chip
- No admin actions (no "Edit", no "Share" button)

**Division list**
Each division is a tappable card showing:
- Division name
- Format label ("Single Elim + Back Draw" or "Groups + Playoffs")
- Team count
- Current stage chip: "Group Stage", "Playoffs", or nothing for SINGLE_ELIM_CONSOLATION

Tapping navigates to `/t/[slug]/d/[divisionId]`.

**Empty state**
If the tournament has no divisions: "No divisions yet."

**Layout**
- Single-column list on mobile, up to 2-column grid on tablet+
- No sidebar

---

## Division Detail (`/t/[slug]/d/[divisionId]`)

### Data model recap
- **SINGLE_ELIM_CONSOLATION**: one bracket (main draw) + optional back draw (consolation). No group stage.
- **GROUP_PLAYOFF**: group stage first (`groupPlayoffState = "GROUP_STAGE"`), then playoff bracket (`groupPlayoffState = "PLAYOFF_STAGE"`). Playoff bracket may also have a back draw (isConsolation matches).

### Stage navigation

Show a top tab bar with the relevant stages for the division format:

| Format | Tabs shown |
|---|---|
| SINGLE_ELIM_CONSOLATION | "Main Draw" (always) · "Back Draw" (if back draw matches exist) |
| GROUP_PLAYOFF — GROUP_STAGE | "Groups" |
| GROUP_PLAYOFF — PLAYOFF_STAGE | "Groups" · "Playoffs" (default tab = Playoffs) |
| GROUP_PLAYOFF — PLAYOFF_STAGE + back draw | "Groups" · "Main Draw" · "Back Draw" (default = Main Draw) |

Active tab is underlined in green (matching existing tab style). Switching tabs does not navigate — client-side state only.

### Groups tab

Display each group as a card:
- Group name ("Group A", "Group B", …)
- Standings table: Rank · Team · W · L · Sets W · Sets L
  - Sorted by wins desc, then sets diff desc
- Below the table: list of group matches with scores (same set-box style as bracket cards)
- Teams that qualify for playoffs are highlighted (top N based on `groupPlayoffConfig.playoffSize / groupCount`)

**Mobile**: groups stack vertically, full width.

### Playoffs / Main Draw / Back Draw tab

Reuse the existing `BracketTree` component (horizontal scrollable bracket). No changes needed to the bracket rendering itself.

On mobile, the bracket scrolls horizontally within the viewport — do not scale it down to the point of illegibility.

### Match detail drawer

Tapping a match card opens the existing `MatchDrawer` (right-side panel on desktop). On mobile it becomes a **bottom sheet** (slides up from bottom, full width, ~60% viewport height, scrollable).

---

## Mobile-first layout

### No sidebar
Remove `<SidebarNav />` from the participant division page. The back-link ("← Tournament Name") at the top is sufficient navigation.

### Touch targets
- Tab buttons: minimum 44px tap height
- Match cards: existing 112px height is fine; ensure horizontal padding ≥ 16px

### Bottom sheet (mobile match detail)
- Triggered when viewport width < 640px
- Slides up with CSS `transform: translateY` transition (200ms ease-out)
- Backdrop tap closes it
- Handle bar at top center (32×4px pill, `var(--ink-muted)` color)
- Scrollable content area with 24px side padding

### Breakpoints
- `< 640px` — mobile: single column, bottom sheet drawer, no sidebar
- `≥ 640px` — tablet/desktop: existing layout with right-side drawer

---

## Data fetching

### Tournament landing
Fetch from the server component:
- `Tournament.findOne({ slug })`
- `Division.find({ tournamentId })`
- `Team.countDocuments({ divisionId })` for each division

### Division detail (additions to current page)
Current page only fetches bracket matches (`bracketSlot: { $exists: true }`). Add:
- `Match.find({ divisionId, isGroupStage: true })` — for the Groups tab
- `Group.find({ divisionId }).sort({ order: 1 })` — group names and order

Pass group/match data to the client component alongside the existing bracket data.

---

## What stays the same

- URL structure — no changes to existing routes
- `serialize()` usage at prop boundaries
- Score display (SetBoxes, set-score layout in drawer)
- Match card dimensions and bracket connector SVG logic
- Green accent color (`var(--green)`) for winner highlights and active tabs

---

## Out of scope

- Authentication / participant login
- Score entry or any write operations
- Push notifications for match results
- Tournament registration / sign-up flow
- Admin controls surfaced on participant pages
