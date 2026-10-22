# M1 Plan: Rules engine

*Status: Approved by Gregory Kelly, 2026-10-22 · Design doc §9, milestone M1*

## Goal

Turn the approved rules table and test jobs into working, tested software: rule files in YAML, the fact list format, and a rules engine that produces the expected answer for every approved test job. No AI, no UI, no PDFs yet.

## What gets built

| Piece | Where | What it is |
|---|---|---|
| Project setup | repo root | TypeScript, Vitest (test runner), Zod (fact list validation), a YAML parser. Next.js is **not** added yet; it joins in a later milestone without moving anything below |
| Fact list format | `src/engine/facts.ts` | The ~25 work item kinds and their facts, per design doc §4.1 |
| Rule files | `rules/state/nj/`, `rules/municipal/maplewood/` | Every row of the rules table as YAML, keeping its ID. Assumptions in `assumptions.yaml`; zoning flags in Maplewood `config.yaml` |
| Rule checker | `src/engine/load.ts` | Validates every rule file on load: correct shape, every referenced assumption exists, no duplicate IDs |
| Engine | `src/engine/` | `determine(facts, rules, today)` returns the determinations: per-item tier and rule, job tier, forms and signers, form entries, zoning, plans, tips, flags, questions |
| Test files | `tests/jobs/J-01.yaml` … | For each approved job: the facts *before* follow-ups, the expected questions, the facts *after* follow-ups, and the expected determinations |
| Rules reference | `scripts/render-rules.ts` → `docs/rules-reference.md` | Regenerates the readable rules table from the YAML (your review format from now on) |
| Demo command | `npm run determine -- J-01` | Prints a job's determinations in plain language, so you can see output without reading test code |

## Tests (written before the engine)

1. **The 10 approved jobs + J-05b**: exact match on everything in the test doc.
2. **Question selection**: starting from the "before follow-ups" facts, the engine asks exactly the expected questions, no more and no fewer.
3. **Gap cases** listed in the test doc: out-of-scope property, missing HIC registration, homeowner doing trade work, bearing wall removal, lead abatement, oil-to-gas conversion, and a "don't know" answer taking the conservative branch.
4. **Rule file checks**: every rule ID in the approved table exists in the YAML, and every file is valid.
5. **Determinism**: running the same job twice gives byte-identical output.

## Decisions in this plan (my recommendations)

1. **Rules keep the table's IDs and file split, but match by work item kind.** For example, KB-10 to KB-13 (electrical) also cover basement electrical, which is what FB-07 ("per KB-10 to KB-13") meant. No rule is duplicated.
2. **One refinement to how questions are chosen** (design doc §5). "Ask if the answer would change the result" works for yes/no-style facts. For numbers it works like this:
   - **Costs:** a missing cost for a trade that has a section is always asked. This is why J-08 and J-09 ask for the electrical cost.
   - **Counts:** a count like new outlets is tested at the thresholds the rules use (5 vs. 6), not at every possible number.
   - **Facts the rules only compare to a threshold become choices.** For example, existing roof layers is "one" or "two or more".
3. **The engine never reads the clock.** "Today" is passed in, so the license-expiry check is testable. Tests use 2026-10-22.
4. **An item that matches no rule is an error, not a skip** (design doc §4.2). Tests cover it.

## What you'll review at the end

- `docs/rules-reference.md`: the rules table, generated from the YAML. It should read the same as the approved one.
- A test report: every job and case, pass or fail.
- A few demo runs (e.g. J-01, J-03 before and after follow-ups, J-08) in plain language.

## How it's done

On a branch, `m1-rules-engine`. Tests and fixtures first (all failing), then the engine until they pass, then the reference script and demo command. After your review, merge to `main`.

**If a test job turns out to be wrong or ambiguous** while I'm encoding it, I won't change the expected answer myself. I'll stop and bring it to you, since expected answers change only with your review (design doc §7).
