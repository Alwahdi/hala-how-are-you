# Roadmap

## CPU load and direct API (plan approved 2026-11-11)
- [x] 1. No overlap: scripts exit when a previous run is still going
- [x] 2. Lighter UM v6 read: one print as-value, online from hotspot active, short pauses
- [x] 3. Pace by size: full card read every 30 min above 1,000 cards
- [x] 4. Direct API: light check, no UM via API, per-command timeout, 30-min backoff, clear reason in UI
- [x] 5. Record card read duration, show in router health, alert when too long
- [x] 6. Verify on CHR v6 (3,000 UM cards) and v7, tests
- [x] 7. D-037, status, AGENTS.md

## Read-only UI/UX study (requested 2026-11-12)
- [x] Inspect public and authenticated screens, Arabic/English and desktop/mobile
- [x] Reproduce stale-status, failed-load and rejected-save cases without router actions
- [x] Write prioritized findings and proposed acceptance checks in docs/03-product/ui-ux-audit-2026-11-12.md
- [ ] Implement changes and update approved status/index documents — blocked on founder approval
