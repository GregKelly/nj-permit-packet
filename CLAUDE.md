# Permit Packet

A local web app that turns a NJ residential contractor's plain-language job description into a complete, print-ready construction permit packet. Learning project. Read `product-brief.md` first; it's the source of truth for problem, user, scope and what "done" means.

## Where we are

Product definition is done (see `product-brief.md`, and `docs/research-notes.md` for sources). The v1 rules table (`docs/rules-table-v1.md`) is **approved** (2026-10-22); its remaining open questions are for the construction office (§6). Ten test jobs with expected outputs (`docs/test-jobs-v1.md`) are **approved**. The technical design (`docs/design-doc.md`) is **approved** (2026-10-22). **M1 (rules engine) is done**: accepted by the owner and merged to `main` (2026-10-23). Rules live in `rules/` (reviewed as `docs/rules-reference.md`); four test-doc conflicts were decided by the owner and recorded in `docs/test-jobs-v1.md`. **The M2 plan (packet builder) is approved** (2026-10-23): `docs/plans/m2-plan.md`. **M2 (packet builder) is done**: accepted by the owner and merged to `main` (2026-10-23); see the plan's "Build notes". LC-03 now warns instead of blocking printing; copies lines are rules SB-01/SB-02 (A-22). Official forms, field maps and fingerprints live in `assets/forms/`; the builder is `src/packet/`. **Homeowner trade work** (replaces the LC-05 stop for a contractor's job): plan, rules addendum (rules table §4.7, A-23 to A-27, Q-12 to Q-16) and test jobs J-11 to J-13 **approved** (2026-10-26); see `docs/plans/homeowner-trade-plan.md`. **Homeowner trade work is done**: accepted by the owner and merged to `main` (2026-10-26). Rules in `rules/state/nj/homeowner.yaml`; see the plan's "Build notes". **Next:** M3 (AI layer). If an approved expected answer looks wrong, stop and ask the owner; don't change it. Later milestones follow the same pattern: short plan in `docs/plans/`, owner approval, build (design doc §9).

## Commands

- `npm test`: engine, question-selection, rule-file, homeowner trade work, packet (field read-back, pages, form fingerprints) and determinism tests (`npm run test:report` for the verbose list)
- `npm run determine -- J-01` (add `--before` for facts before follow-ups): a test job's determinations in plain language
- `npm run render-rules`: regenerate `docs/rules-reference.md` from `rules/` after any rule edit
- `npm run packet -- J-01` (add `--hvacr clearair` etc. to swap a sub): writes the print-ready packet to `out/J-01.pdf`
- `npm run form-proof -- F120`: proof sheet (every box labelled with its PDF field name) to check a field map; rerun after any form revision
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
