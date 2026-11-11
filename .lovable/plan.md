# "Send to customer" assistant + card search in the interface concept

## My opinion
Strong idea — it answers the #1 complaint we recorded ("why did my card finish so fast?") with proof instead of argument. The owner stops defending himself; the customer sees his own sessions. This is also a good feature to test interest with on the page.

Honesty limit: the page is still a demonstration (no real network connected). So everything below works on the demo cards only and stays labeled "demonstration". Nothing is sent automatically and nothing is stored.

## What the owner will do (the journey)
1. **Find the card fast:** a search box at the top of the concept ("Type card number…"), results as you type, clear "No card found" with a "Show all" button. Quick filter chips: All / Almost finished / In use / Not used yet.
2. **Open the card:** details window gets a new **Sessions** section — each session with start time, duration, download/upload, and device (demo values).
3. **Press "Reply to customer":** a small assistant opens with:
   - A ready, polite message in the customer's language (Arabic or English, owner can switch): card number, package, used, remaining, total connection time, number of sessions, the biggest session, and the plain reason ("most usage was downloading, e.g. video").
   - Tone choice: Short / Detailed.
   - Actions: **Copy text**, **Send via WhatsApp** (opens WhatsApp with the text; the owner chooses the contact and presses send himself), **Download as image** (a clean branded report card, Arabic RTL, Latin digits), **Share** on phones that support it.
4. **Record the complaint (demo):** a "Log this complaint" button with a reason picker ("Finished fast", "Slow", "Cannot connect") and optional customer name. In the demo it appears in a small "Complaints today" list for the session only and disappears on reload — showing the idea without saving personal data. Real saving comes only in the real product.

## Design (bold, clear)
- Search bar + filter chips above the card list; same status chips/colors as D-022/D-023.
- Sessions as a compact timeline with bars sized by usage — the big session stands out at a glance.
- Assistant opens as a second step inside the card window (not a new popup on top of a popup), with a live preview of the message/image and a back button.
- Image report: 1080x1350, dark Mikro surface, card number large, remaining bar, sessions list, "Prepared with Mikro" footer.

## Checks (NN/g 10 + D-015/D-017)
- Status visible (copied ✓, image ready), undo/back at every step, no color-only meaning, owner language, consistent ar/en, keyboard and Escape, 44px touch targets.
- Browser test at 390 and 1280px, Arabic and English: search, filter, open card, copy, WhatsApp link content, image downloads correctly with Arabic shaped right.
- Unit tests: message builder output (values, units, language), search/filter, biggest-session pick.

## Docs
- New decision D-024 (assistant + demo-only complaint log, no storage, no auto-send); glossary terms "session" (جلسة) and "customer reply".

## Technical details
- `specimen-data.ts`: add demo `sessions[]` per card, `buildCustomerMessage(card, lang, tone)`, `filterCards(query, state)`.
- New `customer-reply.tsx` (steps inside the existing dialog), `card-search.tsx`, `complaint-log` in React state only.
- Image: render report to `<canvas>` in the browser (no new service, no upload); WhatsApp via `https://wa.me/?text=`; `navigator.share` when available.
- No database or server changes.
