# Mikro: phone alerts, background watcher, router health check, and actions (removing finished cards, restarting)

## What you chose
- Alert channel: **a phone notification** (even with the app closed).
- Events: router down/back up, router under strain, ready cards running low, a daily report.
- On the router: remove finished cards, a full health check, restart from the app, scheduled maintenance at night.
- Control: **automatic for safe tasks**, with your confirmation for everything else.

## 1. Phone notifications
- An "Enable alerts" button on the home screen and in account settings, plus a "Send a test alert" button.
- **Android:** works straight from the browser after you allow it.
- **iPhone:** needs "Add to Home Screen" first (an Apple requirement). We show you the steps with pictures at the right moment, and add an app icon and name.
- One switch for each event type, so you control what reaches you.
- An **alert log** (a bell at the top): every alert stays saved even if you missed it on your phone.
- Tapping an alert opens the related page directly (the router, the package, the report).
- No accounts with outside services needed from you.

## 2. The background watcher (runs even if you never open the app)
Checks every minute from our side:

| The event | When we alert | Repeats |
|---|---|---|
| Router down | no signal for 3 minutes | once, then "back up" when it returns, with the outage length |
| Router under strain | CPU above 90% for 3 readings in a row, memory above 90%, temperature above 70, or an unexpected restart (uptime reset) | at most once an hour per type |
| Ready cards running low | a package has under 20 ready cards (packages with 30+ cards) | once a day per package |
| Daily report | 9 pm your time: connected peak, used cards, new cards, outages | daily |

## 3. Router health check (reading only, changes nothing)
A "Router health" page with a simple score and plain-language explanations, built from the common faults we documented:
- Storage and memory almost full (cause of hangs and restarts).
- Router clock wrong / time sync off (causes cards to end early).
- Old RouterOS version or one with a known vulnerability.
- Dangerous services open to the internet (telnet, ftp, socks, proxy) and unknown users or scripts (signs of a break-in).
- Hotspot settings that waste the customer's time: idle timeout off, and more than one device sharing a card.
- Each problem comes with: what it means, why it matters, and a fix button or command to copy.
- Runs automatically once a day, and you get an alert if something new and important appears.

## 4. Actions on the router
**How it works safely:** Mikro does not keep any password with permission to change your router. The script that's already on the router asks Mikro every 30 seconds: "Is there a task for me?" It can only carry out tasks defined in advance inside it (restart, remove a finished card). It can't run any other command, even if someone fakes a request.

- **Restart:** a button in the router card, then a confirmation ("Users will be disconnected for about a minute"). Then live status: "Restarting… back up after 48 seconds". Plus an alert when it's back. Never automatic.
- **Remove finished cards:**
  - Manual: in Cards, "Finished" then "Remove all (37)" with confirmation.
  - Automatic (safe): every night at 3 am, cards that have been finished for 3 days or more (the period can be changed). You get a report: "Removed 37 finished cards".
  - The router double-checks itself that the card is really used up before removing it. A card that isn't finished is never removed.
- Every action is saved in the network log: who requested it, when, and the result.
- It needs **Reconnect once** to update the router's script (one paste).

## Order of work
1. Phone alerts + the bell and alert log + event settings + iPhone guidance.
2. The background watcher (down/back up, strain, low cards, daily report).
3. Actions: restart and removing finished cards (manual then automatic at night) + the network log.
4. Router health page + daily check.

## Technical details
- Web Push standard (VAPID) with no Firebase: keys stored as server secrets, encryption via Web Crypto inside the server (works on the Worker). A service worker dedicated to notifications only (no offline caching), and a manifest file for iPhone.
- Tables: `push_subscriptions` (owner, endpoint, keys), `alert_prefs` (event toggles, daily report time), `alerts` (log + dedup key), `router_jobs` (router_id, type, payload, status, requested_at, done_at, result), `router_events`, plus `finished_at` on cards to compute the 3 days.
- A scheduled job every minute → `/api/public/jobs/watch` (verifies the scheduler identity), plus a daily one for the report, nightly maintenance and the health check.
- Report script: reads the response of `/tool fetch` (`output=user as-value`) to receive at most one task; adds fields for the health check (NTP, services, socks/proxy, user and script counts, idle-timeout, shared-users). Script permissions gain `reboot`. Card removal: names limited to 40 per batch, and the router checks `uptime>=limit-uptime` or `bytes>=limit-bytes-total` before removing.
- Tests: when an alert is sent and when it's suppressed (dedup and rate limit), detecting a restart from uptime, choosing cards for automatic removal (3 days), and the health score.
- A decision file D-033 (alerts and actions through a task queue with no write password) + updates to status.md and AGENTS.md.
