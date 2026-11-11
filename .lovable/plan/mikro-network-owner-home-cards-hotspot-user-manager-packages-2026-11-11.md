# Mikro: network owner home, cards (Hotspot + User Manager), packages, card style, and a permanent record

## What we know now

- Your dashboard has 4 tabs (Home, Cards, Active, Network). "Add cards" and "Print" are marked "Soon".
- So far only 6 Hotspot cards have reached Mikro, and no User Manager cards.
- All we can do on the router today is read. Adding cards or packages means Mikro needs permission to write to the router. That is a big security decision and the core of this plan (see "The decision" below)
- if user manager is not setup it helps the user setup the user manager and things to be the best ever you got me everything to be the best and very clear and so on you got me ! .

## 1. Navigation and home screen (from a network owner's point of view)

Bottom bar on the phone, 5 items with a standout center button:

```text
[ Home ]  [ Cards ]  ( + Quick )  [ Active ]  [ More ]
```

- **Quick button in the center** (round, raised, in the brand color): opens a sheet with what an owner does most: "Add cards", "Print the last batch", "Look up a card" (number or QR), "Who's connected now".
- **More**: routers and network, account settings, language, sign out.
- **Home** answers three questions in 5 seconds:
  1. Is my network working? (one status line: routers online/offline)
  2. How many are connected now, and the difference from the same time yesterday (+12 / -5) with a small 24-hour chart.
  3. Cards: how many new ones are ready for sale, how many are almost used up, and how many were used today. A warning when ready cards drop below a threshold ("You have 18 cards left in the 200 package").
- Every number can be tapped and opens the matching filtered list.

## 2. Cards: two kinds with no confusion

- A clear switch at the top of Cards: **Hotspot | User Manager** (it only shows when both exist on the router; otherwise just the one that exists).
- A short plain-language explanation shows once: "Hotspot = cards stored on the router itself; User Manager = a central card system on the router (v7)".
- The packages (Profiles) for the selected kind appear as large cards: name, speed, duration/data, number of ready cards in each package. Tapping a package shows its cards.
- **Every card looks tappable**: an arrow on the side, a press response, a clear outline on focus. Tapping opens a visual detail sheet: a circular usage gauge (time/data), status, package, first and last use, the device (MAC) if it's connected now, and buttons: copy the number, send to a customer, print.
- The same tappable treatment on the cards in the sample on the landing page.

## 3. Card style, set once

- In the steps after linking the router, one screen: "How do you want your cards?"
- **We work it out automatically**: we read the first 30 cards of each kind and guess the style, then show the result as a ready card picture, not technical terms:
  - "Number only" (username = password, or no password)
  - "Number + secret code"
  - Length, digits only or letters too, and any fixed prefix (e.g. 77…)
- You only press "Yes, like this" or "Change". It's saved in **account settings** (a new page under More) and can be changed any time. Separate settings for Hotspot and User Manager.
- Any new card later is generated in this style.

## 4. Add packages and add cards (depends on the decision)

- **Add a package**: simple form: name, price, speed (picked from options: 1M/2M/4M…), duration or data, number of devices. Live preview of what will be created.
- **Add cards**: choose the kind, then the package, then the count (quick buttons 10/50/100), then a preview of 3 sample cards in your saved style, then "Create". After that come the result and Print/Share.
- Printing: ready templates (A4 sheet of 40 cards, thermal) with network name and package.

## 5. A permanent record that doesn't disappear with the router

- We save every reading to Mikro: number connected (every 5 minutes), every session (start/end, card, MAC, time, data), every new card, every used-up card, and router outages/restarts.
- So if the router restarts or its log is wiped, the history stays. Two views: "Connected over time" (today vs yesterday vs last week) and "Network log" (a list of events with search).
- Keep data for 12 months.

## The decision (needs your approval)

Adding cards or packages requires a second user on the router with write permission limited to the Hotspot and User Manager menus only. It gets this through the same paste command, after a clear opt-in from you ("Allow Mikro to add cards"). It doesn't touch firewall, addresses, or users. It only works where direct access is possible (no NAT). Behind NAT, the request is queued and the router picks it up on its next signal.

## Order of work

1. Navigation + center button + Home + More/Settings (no new permissions).
2. Hotspot/User Manager split + packages + tappable cards with a visual sheet (cards in the app and on the landing page).
3. Permanent record + "today vs yesterday" comparison.
4. Card-style detection + settings screen.
5. After your approval of the decision: the write user, then Add package, then Add cards + printing.

## Technical details

- Navigation: `dashboard.tsx` gets split into components per tab plus `more` and `settings`; center button = Sheet with quick actions.
- Data: new tables `network_settings` (card style per source), `active_snapshots` (router_id, at, hotspot, um), `session_log` (closed sessions), `router_events`; written only by server code, with read policies for the owner only. Daily cleanup of anything older than 12 months.
- Style detection: a pure, tested function over card samples (password = name? length, character set, common prefix). Card passwords are never stored; only "is it equal to the name?" is saved as a yes/no while reading.
- Writing: a `mikro-write` group with `read,write,api` limited in practice by our code to `/ip/hotspot/user`, `/ip/hotspot/user/profile`, `/user-manager/*`; an action queue table `router_jobs` for routers behind NAT, executed by a scheduled script on the router.
- Tests: style detection, today-vs-yesterday difference, and building card names from the style.
- Update D-032 or a new decision D-033 for write permission, plus status.md.