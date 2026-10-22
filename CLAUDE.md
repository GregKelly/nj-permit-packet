# Permit Packet

A local web app that turns a NJ residential contractor's plain-language job description into a complete, print-ready construction permit packet. Learning project. Read `product-brief.md` first; it's the source of truth for problem, user, scope and what "done" means.

## Where we are

Product definition is done (see `product-brief.md`, and `docs/research-notes.md` for sources). The v1 rules table (`docs/rules-table-v1.md`) is **approved** (2026-10-22); its remaining open questions are for the construction office (§6). Ten test jobs with expected outputs are drafted in `docs/test-jobs-v1.md` and are **awaiting owner review**. Next: confirm the tech approach with the owner, then build.

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

## Tech approach (proposed; confirm with owner before scaffolding)

- TypeScript + Next.js, running locally. Three tiers kept distinct: UI, a server layer (rules engine, Claude API calls, PDF filling), and SQLite for profile/subcontractors/jobs.
- `pdf-lib` to fill the **official** fillable DCA PDFs (not lookalikes).
- Claude API via the Anthropic SDK; use the current Claude models and check the `claude-api` skill before writing API code. API key from env (`ANTHROPIC_API_KEY`), never committed.
- No Docker for now.

## Working with the owner

- The owner is a product manager, not a full-time developer. Explain technical choices briefly and in plain terms; propose and recommend rather than survey options.
- Review gates: rules table before code; show working output before polish.
- Don't add timelines or estimates to docs.
