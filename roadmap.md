# Roadmap

## CPU load and direct API (plan approved 2026-11-11)
- [ ] 1. No overlap: scripts exit when a previous run is still going
- [ ] 2. Lighter UM v6 read: one print as-value, online from hotspot active, short pauses
- [ ] 3. Pace by size: full card read every 30 min above 1,000 cards
- [ ] 4. Direct API: light check, no UM via API, per-command timeout, 30-min backoff, clear reason in UI
- [ ] 5. Record card read duration, show in router health, alert when too long
- [ ] 6. Verify on CHR v6 (3,000 UM cards) and v7, tests
- [ ] 7. D-037, status, AGENTS.md
