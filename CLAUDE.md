# Permit Packet

A local web app that turns a NJ residential contractor's plain-language job description into a complete, print-ready construction permit packet. Learning project. Read `product-brief.md` first; it's the source of truth for problem, user, scope and what "done" means.

## Where we are

Product definition is done (see `product-brief.md`, and `docs/research-notes.md` for sources). The v1 rules table (`docs/rules-table-v1.md`) is **approved** (2026-10-22); its remaining open questions are for the construction office (§6). Ten test jobs with expected outputs (`docs/test-jobs-v1.md`) are **approved**. The technical design (`docs/design-doc.md`) is **approved** (2026-10-22). **M1 (rules engine) is done**: accepted by the owner and merged to `main` (2026-10-23). Rules live in `rules/` (reviewed as `docs/rules-reference.md`); four test-doc conflicts were decided by the owner and recorded in `docs/test-jobs-v1.md`. **The M2 plan (packet builder) is approved** (2026-10-23): `docs/plans/m2-plan.md`. **M2 (packet builder) is done**: accepted by the owner and merged to `main` (2026-10-23); see the plan's "Build notes". LC-03 now warns instead of blocking printing; copies lines are rules SB-01/SB-02 (A-22). Official forms, field maps and fingerprints live in `assets/forms/`; the builder is `src/packet/`. **Homeowner trade work** (replaces the LC-05 stop for a contractor's job): plan, rules addendum (rules table §4.7, A-23 to A-27, Q-12 to Q-16) and test jobs J-11 to J-13 **approved** (2026-10-26); see `docs/plans/homeowner-trade-plan.md`. **Homeowner trade work is done**: accepted by the owner and merged to `main` (2026-10-26). Rules in `rules/state/nj/homeowner.yaml`; see the plan's "Build notes". **The M3 plan (AI layer) is approved** (2026-10-26): `docs/plans/m3-plan.md`. **M3 (AI layer) is done**: accepted by the owner and merged to `main` (2026-10-26); evals pass on Sonnet 5.5, used for all three calls (see the plan's "Build notes" and `docs/reports/`). CQ-07 now asks for unknown form counts. Before any paid eval: settle open answer-key questions, try `npm run eval -- --rescore` (free), and state the cost. **The M4 plan (the app) is approved** (2026-10-27): `docs/plans/m4-plan.md`; building on branch `m4-app`. **Built so far:** parcel lookup (`src/parcel/`, `npm run parcel -- "34 Oakview Ave" Maplewood`, saved responses in `tests/parcel/`), saved data (`src/db/`, Node's built-in SQLite, `data/permit-packet.db`), the job service behind the screens (`src/jobs/service.ts`), the cover checklist's "Not in this packet" section, the Setup screen (`app/setup/`), the Home screen (`app/page.tsx`), the Describe screen (`app/jobs/new/`), the job page (`app/jobs/[id]/`: questions, Review with the facts editor next to the determinations, Print with scope and packet; the PDF is served by `app/jobs/[id]/packet/route.ts`), shared app pieces (`app/lib/`, `app/globals.css`, `app/ui/`), `npm run app`, and tests `tests/app.test.ts` and `tests/parcel.test.ts` (all pass). J-01 ran end to end in Chrome with the real AI (2026-10-27), matching its approved result; GIF in the owner's Downloads. Files are found from the project root (`src/paths.ts`) because Next.js bundles server code. **Still to do:** build notes in the plan (record that a real J-01 run cost about 7.5 cents, not the 2 cents the plan estimated), then the owner's timed run-through (delete `data/` first so Setup starts empty). Next.js is pinned to 16.4.1 (earlier versions have critical advisories); the `zod` v3 audit warning is known and deferred. Home type is picked on the Describe screen with the tax record's unit count (`DWELL`) shown as a check; the work-site ZIP comes from the typed address, never the parcel record (its ZIP is the owner's mailing ZIP; see `docs/research-notes.md`). If an approved expected answer looks wrong, stop and ask the owner; don't change it. Later milestones follow the same pattern: short plan in `docs/plans/`, owner approval, build (design doc §9).

## Commands

- `npm test`: engine, question-selection, rule-file, homeowner trade work, packet (field read-back, pages, form fingerprints), determinism and offline AI-layer tests (no API calls) (`npm run test:report` for the verbose list)
- `npm run determine -- J-01` (add `--before` for facts before follow-ups): a test job's determinations in plain language
- `npm run render-rules`: regenerate `docs/rules-reference.md` from `rules/` after any rule edit
- `npm run packet -- J-01` (add `--hvacr clearair` etc. to swap a sub): writes the print-ready packet to `out/J-01.pdf`
- `npm run form-proof -- F120`: proof sheet (every box labelled with its PDF field name) to check a field map; rerun after any form revision
- `npm run extract -- J-03` / `E-01` (add `--model haiku|sonnet|opus`): the extract call on one description, with its score (calls the API)
- `npm run ask -- J-03`: extract, then the first round of follow-up questions as the contractor sees them (calls the API)
- `npm run scope -- J-01`: the scope narrative from confirmed facts, saved to `out/J-01.scope.json`; then `npm run packet -- J-01 --narrative` (calls the API)
- `npm run eval` (`--models sonnet --runs 1`, `--jobs J-03,E-01`, `--record`, `--dry-run`, `--rescore`): the M3 evals. Buys only answers not already saved in `out/eval/answers/`; `--rescore` re-grades saved answers for free. Only a full three-model run writes `docs/reports/m3-eval-report.md`. Costs money; never part of `npm test`
- `npm run app`: the app at http://127.0.0.1:3000 (this computer only). Start it from your own Terminal so it gets `ANTHROPIC_API_KEY` (read from the macOS Keychain in `~/.zshrc`)
- `npm run typecheck`

## Product decisions (settled; don't relitigate)

- Primary user: small residential contractor or office manager. Starting market: Maplewood, NJ only.
- Output: a printed paper packet. Contents: the filled F100 and required subcode technical sections, an owner authorization page, a reviewer-friendly scope of work, and a cover checklist of who signs where and what to attach. No electronic submission.
- Plans/drawings are flagged when needed, never generated.
- No fee calculation in v1: fee fields on the forms are office use only, so they're left blank. The Maplewood fee schedule is kept in `docs/rules-table-v1.md` Appendix A in case a quote-time estimate is added later.
- Each licensed subcontractor completes and signs their own technical section (assumption); contractor saves a subcontractor directory once.
- Property lookup by address only, via NJ statewide parcel data (see research notes).
- Division of labor: **AI interprets and writes. Rules decide. The contractor confirms.**
  - The Claude API extracts structured facts from the job description (unknowns marked `unknown`, never guessed), phrases follow-up questions for the unknowns the rules say matter, and drafts the scope-of-work narrative from confirmed facts only.
  - The rules engine (plain, deterministic, testable code over rule data) decides classification, required forms, zoning prior approval, plan needs, and the form entries the applicant is responsible for (work type, estimated cost by subcode, quantities). Every determination carries a reason and, where possible, a code citation.

## Rules engine requirements

- **Rules are data, not code.** Keep them in readable files (e.g., YAML/JSON) that the owner can review and edit. State-level rules are separate from municipality-level rules (zoning triggers, local requirements) so another town can be added later.
- **Assumptions are explicit and configurable.** Each uncertain rule is marked as an assumption with a note on how to confirm it, and is surfaced to the user in the app. Current assumptions:
  - Maplewood: purely interior alterations do NOT require a residential zoning application (Ch. 271). Exterior work requires one only when it changes footprint, height, openings, outdoor equipment or lot coverage; like-for-like exterior replacement gets a "probably not required, confirm with Zoning" note. Both must be flippable via config.
  - Licensed electrical/plumbing subcontractors sign their own F120/F130 sections.
- Same input → same output. Build an automated test suite over the test jobs.

## Tech approach (approved)

See `docs/design-doc.md`, the source of truth for architecture, interfaces, testing and milestones. In short: TypeScript + Next.js running locally; a pure rules engine (`engine/`) over YAML rule files (`rules/`); `pdf-lib` filling the **official** DCA PDFs; SQLite; Claude API via the Anthropic SDK (check the `claude-api` skill before writing API code; key from `ANTHROPIC_API_KEY`, never committed). No Docker.

## Working with the owner

- The owner is a product manager, not a full-time developer. Explain technical choices briefly and in plain terms; propose and recommend rather than survey options.
- Review gates: rules table before code; show working output before polish.
- Don't add timelines or estimates to docs.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
