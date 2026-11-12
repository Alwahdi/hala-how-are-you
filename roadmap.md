# Roadmap

## Voucher issuance, templates and A4 printing (requested 2026-11-12)
- [ ] Approve and implement 1000–1500-card issuance and print handling — current 500 limit, unpaged reads and one-card-per-report throughput require a new scoped plan
- [x] Implement approved single/manual-card and batch forms, explicit Hotspot limits, serialized requests, receipt-based retries and confirmed-card snapshots; test forms and individual commands on isolated v6/v7
- [x] Verify four five-card platform-to-RouterOS batches, confirmation read-back, lease retry and owner PDF download; remove isolated fixtures
- [ ] Complete second-owner isolation, partial failure/pause/resume and single different-password end-to-end — blocked on an approved second test account and retained lab; temporary lab was lost again, public issuance remains disabled
- [x] Study single-card and NAS-Port availability; findings reported
- [ ] Extend session details/NAS-Port — blocked on separate collection scope approval; excluded from current issuance plan
- [x] Prepare reference-faithful single-card visual sample; inspected full-size with synthetic data
- [ ] Apply corrected templates — blocked on founder's acceptance of the visual sample
- [x] Study current functionality and inspect founder's uploaded visual references
- [x] Resolve A4 and requirement for later reprinting; retain credential encryption as a safety requirement
- [x] Approve implementation plan and private credential archive policy
- [x] Implement templates, private images, A4 PDF and batch/archive scaffolding; verify template save/read-back and sample PDF
- [ ] Validate physical A4 output — blocked on founder printer/physical test sheet

## Whole-app mobile-first UX redesign (requested 2026-11-12)
- [x] Review NN/g references and map relevant principles to every current user journey
- [x] Audit account/setup/operations; later dialog checks blocked automatic writes/probes; prior page side effects remain unverified
- [x] Present phased redesign and acceptance matrix for founder approval
- [x] Implement approved scope and verify Arabic/English, phone and desktop behavior

## Sign-in UI, UX and interactions (requested 2026-11-12)
- [x] Inspect current sign-in, recovery and linked-method presentation without account changes
- [x] Approve focused visual and interaction improvement plan
- [x] Implement approved presentation changes without changing verification or account rules
- [x] Verify Arabic/English, mobile and desktop states and authenticated settings open/cancel; update company status

## Independent sign-in methods (requested 2026-11-12)
- [x] Review current phone verification and resolve email/password preference
- [x] Approve plan for phone-only sign-in, independent email/password and settings linking
- [x] Inspect hosted settings: email enabled with confirmation; phone disabled; no accessible WhatsApp connection
- [x] Independent email UI, recovery route and email-change confirmation request; public browser checks
- [ ] Phone signup/login and phone linking — WhatsApp retained; blocked on supported WhatsApp-to-Auth session integration, not SMS
- [ ] Verify real signup, recovery and linking read-back — needs approved test recipient/account

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
- [x] Implement approved UI outcomes, freshness, package scoping, action safety and mobile improvements; update status/index
- [x] Run unit suite and browser acceptance checks without router mutations
- [ ] Verify a real successful save and read-back — needs an approved test account/settings scope
- [ ] Verify actual job execution and reconnect handshake — needs an approved test router, not the production network
