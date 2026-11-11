# Redesign the "Interface concept" card — visual, owner-first, fixed spacing

## What is wrong now (checked in code and screenshots)
- **Bottom edge:** the card has rounded top corners only, no bottom margin, and touches the next section — looks like a layout bug.
- **Hard to read for a network owner:** labels like "Demo cards 3 / Active 2 / Inactive 1" and "Usage 12.5%" are system words; nothing is visual. Data is in MB (2,000 MB) instead of what owners say (2 GB). The owner has to calculate in their head.
- **No answer to the owner's real questions:** "Which card is about to run out?", "How much is left?", "Why did it finish so fast?" (the #1 customer complaint we recorded).

## What the owner thinks when looking (the design follows this order)
1. "Is everything OK?" → one clear status line at the top.
2. "Which card needs attention?" → cards about to run out are marked first.
3. "How much is left?" → a visual bar + "1.6 GB left of 5 GB", no math.
4. "Why did it finish fast?" → details window shows download vs upload as a split bar with a plain sentence.

## New design (bold, visual)
- **Top summary — 3 big tiles with icons and color + text:** "Ready to sell" (unused), "In use", "Almost finished". Big numbers, short labels in owner language.
- **Card rows become visual cards:**
  - Card number large, status chip (green "Active" / grey "Not used yet" / amber "Almost finished"), always icon + word, never color alone.
  - Thick progress bar of **remaining** data, colored by role (green → amber under 20%).
  - One human line: "1.6 GB left of 5 GB · 2 h 10 m used".
  - Whole row clearly tappable (arrow + hover/focus state), opens the details window as today.
- **Details window:** big remaining ring/bar, download vs upload split bar, plain explanation ("Most usage was downloading — e.g. video"), kept labeled as demonstration data.
- **Card frame:** fully rounded corners, proper bottom margin before the next section, faint mesh corner kept.
- **Units:** GB above 1,000 MB, Latin digits 0–9, Arabic in Cairo, full RTL.
- Demo data adjusted to show all three states (one card "Almost finished") so the concept tells a story — still marked as demo.

## Design-system fixes (so the mistake does not repeat)
- Surface rule: every card/panel gets full radius and section spacing tokens; no half-open frames.
- New shared pieces used by landing and design specimen: status chip, usage bar, summary tile, data-size formatter.
- Document in D-023 and the specimen page.

## Checks (NN/g 10 heuristics + D-015/D-017)
- Visibility of status, match with owner language, recognition over recall, minimalist, error prevention (no color-only meaning), consistency ar/en.
- Browser check at 360/390/1280px, Arabic and English: no overflow, bottom spacing visible, row opens details, keyboard focus and Escape work.
- Unit test for the GB formatter and "almost finished" threshold (20%).

## Technical details
- Edit `interface-concept.tsx`, `demo-card-list.tsx`, `specimen-data.ts` (add `formatDataSize`, `cardState`), `styles.css` (`.hero-preview` radius + margin-bottom, new `usage-bar`, `status-chip`, `summary-tile`), `design-specimen.tsx`.
- Test in `src/test/`.
