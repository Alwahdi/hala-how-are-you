# Mikro mesh pattern + color psychology

## What the reference shows
- A fine perforated-metal mesh (diamond/hex holes, like a router grille or speaker cover), lit by a soft teal-green glow and fading into dark corners.
- Important: the hexagon-cube mark in the center is MikroTik's own logo. We take the **mesh texture only**, never the logo or its hexagon-cube shape — Mikro describes MikroTik but must not look like an official MikroTik product.

## Opinion
Yes, use it — it fits better than the current square grid. A metal mesh says "real network hardware", which is exactly our audience (network owners and engineers). Rule: texture is a background material, never decoration on top of content.

## How it enters the design system (3 levels, one source)
1. **Page background (strong):** mesh at low opacity + green glow from top, fading to dark edges (vignette). Replaces the current square grid + diagonal lines.
2. **Feature surfaces (light):** hero card, "interface concept", and the sign-up dialog header get the mesh masked to one corner, very faint.
3. **Never:** behind body text, inside forms/inputs, card lists, tables, or numbers — readability first.
- Mobile: smaller mesh cell and lower opacity; respects reduced-motion (no animated glow).
- One token set: `--mesh-cell`, `--mesh-opacity`, `--mesh-glow`, plus a `mesh-surface` utility so every use comes from the same definition.
- Added to `/design-specimen` as a "Texture" section with do/don't examples.

## Color psychology (honest answer)
"Psychologically" = what feelings and expectations a color triggers. Research is real but weaker than people claim: meaning depends on culture, context and contrast more than the hue itself. [assumption, general color-research literature, not tested on our users]

- **Dark background:** focus, technical tool, "control room" — fits engineers watching networks at night; reduces glare. Risk: can feel cold or "hacker" if too black.
- **Green:** "online / working / OK" — in networking, green LED = connected. This is our strongest fit: Mikro's promise is reassurance ("your network is OK"). Also means money/profit, which suits card sales. Note: MikroTik itself uses teal-green, so ours must stay distinct (brighter, more lime) to avoid looking official.
- **Purple accents:** premium, smart, innovative — good for paid/upgrade moments, but in small doses.
- **Risks to manage:** red/green must never be the only signal (color blindness ~8% of men) — always add an icon/text; green must not be used for errors or warnings.
- **Verdict:** the palette suits the reassuring, practical tone. Not a change of colors — a tightening of roles: green = healthy/primary action, purple = premium/highlight, amber = warning, red = fault.

## Steps after approval
1. Build mesh pattern (pure CSS/SVG, no image file) and tokens in global styles; replace current background.
2. Apply light corner mesh to the 3 feature surfaces only.
3. Document color roles + texture rules in a new decision (D-022) and update D-021 as superseded for the pattern part.
4. Add Texture + color-role section to the design specimen.
5. Verify in browser at 390 and 1280px, Arabic and English: text contrast, no visual noise behind forms, continuous pattern to page end.

## Technical details
- Mesh via inline SVG data-URI `background-image` (diamond holes) + `radial-gradient` glow + `mask-image` vignette in `src/styles.css`; `@utility mesh-surface`.
- No new dependencies; no logo assets used.
