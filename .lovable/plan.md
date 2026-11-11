# Plan: network onboarding, network dashboard, and automatic direct connection via API

## What we found
- Port 8728 is the MikroTik API (the one other programs use), not HTTPS. The app only tries HTTPS (REST), so it shows "unreachable" even with the right port and a router that works fine.
- REST works on v7 only, while the API works on v6 and v7, so switching to the API covers every router.

## 1. Onboarding = add your network
A single path for first-time users (instead of a "welcome" screen and then an "add router" screen):
1. **You are:** network owner / engineer.
2. **Your network:** network name and city (with suggestions).
3. **Connect the router:** one line to paste, then "Connected".
4. **Done:** goes straight to the network dashboard.
- Adding another router later moves to "Network settings → Routers". It is no longer the main button.

## 2. Network dashboard (main screen)
Focus: watching the network and its cards, not the routers.
- **At the top:** active now, today's cards (used / new / expired), sold cards this week, network status (online / issue).
- **Cards:** list from Hotspot and User Manager with search, filter (unused / active / expired / almost used up), and the details of each card (consumption, time, device, last use).
- **Active users:** who is connected now, consumption and time, from Hotspot and User Manager.
- **Packages (Profiles):** from Hotspot and User Manager, with the number of cards in each.
- **Network health:** a simple summary of the routers (CPU, memory, temperature, uptime) and alerts.
- **Quick actions:** "Add cards" and "Print cards". They show as "Coming soon" in this phase, because they need write permission (step 5).
- On phone: a bottom bar with Home, Cards, Active, Network.

## 3. Automatic direct connection, no questions
- The router itself sends: the API port and its status, the API-SSL port, the IP Cloud name, and whether it is behind NAT.
- If it is not behind NAT and IP Cloud is on, we connect automatically: **8729 (encrypted) first, then 8728** with the read-only user. We choose, the user enters nothing.
- After it succeeds we always rely on it for all data, and the reports (every 30 seconds) become a backup.
- Behind NAT: we read cards through the router itself. It sends a summary every 30 seconds and the card list every 5 minutes, in batches.
- The dashboard shows a small line: "Direct via IP Cloud (8729 encrypted)" or "(8728)" or "Via reports".
- The manual address entry stays under "Advanced" only, with the input cleaning that already exists.

## 4. Read permissions
- The read-only user is extended to cover the API (api, read) on v6 and v7. The owner presses "Reconnect" once to update the user.

## 5. Next phase (not in this plan)
- Add and print cards for real: a separate user with permission to create hotspot / User Manager cards only. This is a separate security decision that will come with its own plan.

## Technical details
- Implement the RouterOS API protocol (length-prefixed sentences, `/login` with name+password) over TCP using `cloudflare:sockets` in production, and `node:net` in development through a dynamic import. TLS for 8729 via `secureTransport: "on"`. If the self-signed certificate is rejected, fall back to 8728 and record the reason.
- New module `routeros-api.ts` (encode/decode words + tests) and `ip-cloud-probe.ts` uses it instead of REST, with REST kept as an option.
- Report script: add `apiPort`, `apiDisabled`, `apiSslPort`, `apiSslDisabled`, and counts (hotspot users, User Manager users, active). A separate `mikro-cards` script every 5 minutes sends cards in batches to a new endpoint `/api/public/router-cards` with the same token.
- New tables: `router_cards` (router_id, source hotspot/usermanager, name, profile, uptime, bytes, limits, disabled, last_seen) and `router_profiles`, with RLS so only the owner reads them. No passwords are stored. The card's password (the PIN) is not stored in this phase.
- Merge `welcome` + `onboarding` into a single flow. `/routers` becomes `/dashboard` with tabs. Router management goes to `/network`.
- Revise D-031: the rejection of "HTTP without encryption" is reopened at the founder's request for 8728 only, as an encrypted-first fallback, with a read-only user. New decision D-032.
