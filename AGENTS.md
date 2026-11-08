<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md — Company as Code

This repo is the single source of truth for a company building a MikroTik
network-operations ecosystem (network owners, engineers, distributors, end
customers) for Yemen, Egypt, Syria and beyond. Company knowledge lives in
`docs/`; the app code lives in `src/` (not started yet).

## Read order (do not skip, do not read everything)
1. This file.
2. `docs/05-operations/status.md` — where we are, next step, open questions.
3. `docs/README.md` — map of all docs.
4. Only the files the current task needs. Read a folder's `README.md` before its files.

## Approval gates (hard rules)
- Do not build app features, change app code, or start a new phase until the founder explicitly approves a plan.
- Do not change a doc with `status: approved` without founder approval; propose the change first.
- Explain your understanding before acting on ambiguous requests.

## Knowledge rules
- Single source of truth: each fact lives in exactly one file. Elsewhere, link to it with a relative path; never copy it.
- One topic per file. Folder depth max 3 under `docs/`.
- Size limits: index/README files under 80 lines; content files under 300 lines; this file under 150 lines. Split a file before it exceeds its limit.
- Every doc starts with YAML front matter: `type`, `status` (draft | approved | superseded), `owner`, `updated` (YYYY-MM-DD), `related` (list of relative paths).
- The first lines after the title are a summary of at most 5 lines.
- Tag every claim with a confidence level: `[confirmed]` (evidence or founder-confirmed), `[assumption]` (believed, unverified), `[hypothesis]` (must be tested; link its H-id).
- Numbers and market claims cite a source (link or interview id).
- Never delete knowledge. Mark it `status: superseded` and add `superseded_by:` with a link.
- Stable IDs: problems `P-###`, hypotheses `H-###`, decisions `D-###`, personas `PER-###`, ideas `I-##`. Never reuse an ID.
- Use terms exactly as defined in `docs/00-company/glossary.md`; add new terms there first.
- New docs start from `docs/templates/`. Recurring work follows `docs/playbooks/`.

## Decisions
- Every decision (including rejected options) becomes a file in `docs/04-decisions/` using the decision template, and a line in its README index.
- Never re-propose an option recorded as rejected unless the founder reopens it.

## Language
- Agent rules, templates and file names: English (kebab-case file names).
- Company content: Arabic, with technical terms in English in parentheses.
- Any UI built later: bilingual ar/en with full RTL support.

## Security
- Never write passwords, router credentials, API keys, or customer personal data in any file.

## Definition of done (every task)
- Front matter complete and `updated` set to today.
- All relative links resolve.
- No duplicated facts; size limits respected.
- `docs/05-operations/status.md` updated (done, next step, open questions).
- `docs/05-operations/roadmap.md` checkbox updated if a task closed.

## Architecture rules
- The app has a public early-access landing page and a separate client-only design specimen, not live network operations; keep demo data and Latin-number formatting browser-safe to avoid implying live integrations.
- Early-access capture uses a validated public server function with private Cloud storage and no visitor read policies; return no subscriber details and handle duplicates identically to protect leads.
- Early-access contacts share one method/value schema with library-validated international phone numbers; preserve the legacy capture table and backfill new storage so earlier leads are not lost.
- Public-page language is resolved from a saved cookie before Accept-Language in the root server loader and shared through context; this keeps SSR, privacy navigation and manual choice consistent without geographic tracking.
- Unsaved early-access drafts and request state live in a root React provider only, never persistent browser storage; this preserves privacy-return navigation without retaining personal contact data after a full reload.
- Load Arabic Cairo and the proposed Latin font through installed Fontsource CSS, and define glass/color roles in global semantic tokens; this makes actual font use and readable fallback surfaces verifiable.
- Company knowledge is plain Markdown in `docs/`, never only in chat or tool memory — keeps it portable across workspaces and tools.
- Tool memory holds only founder preferences and pointers to `docs/` — avoids two sources of truth.
- Product (app) architecture is designed only after discovery and MVP definition are approved — avoids redesign.
