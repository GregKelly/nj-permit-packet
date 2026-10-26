# M3 Plan: AI layer

*Status: Approved by Gregory Kelly, 2026-10-26 · Design doc §5 ("AI calls") and §9, milestone M3*

## Goal

Add the three Claude API calls the design doc describes: **extract** facts from the contractor's description, **phrase** the follow-up questions the engine picks, and **write** the scope-of-work narrative. Done when the eval report meets the targets below (you approve the targets with this plan). No UI yet; that's M4. Each call is run from a command, like `npm run determine` and `npm run packet` today.

The division of labor doesn't change: the AI turns text into facts and facts into text. It never decides tier, forms, zoning, plans or which questions get asked. Those stay with the engine.

## What I found before planning

- **We already have the answer key for extraction.** Each test job in `tests/jobs/` holds the description and the facts *before* follow-ups, with anything not stated left out (meaning `unknown`). That's exactly what extraction should produce. There are 13 distinct descriptions (J-01 to J-13; J-05b, J-12a and J-13b are variants without their own wording).
- **The fact schema is ready for the AI.** `src/engine/facts.ts` defines every work item kind and its allowed values once. The same definition can describe the AI's required output, so the AI can only answer with values the engine understands.
- **The AI's answers will vary a little from run to run.** Current Claude models no longer offer a "randomness off" setting. That's acceptable here because nothing the AI produces reaches the packet without the contractor confirming it, but it means the evals run each description several times and score the worst run, not the best.
- **Not everything in a description comes from the AI.** Block, lot and class come from the parcel lookup (M4). The contractor's own details and the subcontractor directory never go to the API (design doc §5). What the description *can* tell us, and the parcel data can't, is whether it's a twin or two-family, whether the owner lives there, who does which trade ("Northside is doing it", "the owner is doing the wiring"), and the costs.

## What gets built

| Piece | Where | What it is |
|---|---|---|
| Extract | `src/ai/extract.ts` | Description in → work items, costs, who does each trade, and the few property facts a description can state (dwelling type, owner lives there). The output is checked against the fact schema before anything else sees it |
| Phrase questions | `src/ai/questions.ts` | The engine's question keys in → one plain-language question per key, with an answer label for each allowed value plus "Don't know" |
| Write scope | `src/ai/scope.ts` | Confirmed facts and determinations in → a short narrative for the plan reviewer, grouped by trade |
| Checks | `src/ai/checks.ts` | Plain code, no AI, that inspects every AI answer (below) |
| Prompts | `src/ai/prompts/` | The instructions for each call, as readable text files you can review, like the rule files |
| Settings | `src/ai/config.ts` | Model and effort level per call. Starts with `claude-sonnet-5-5` for all three (design doc); the evals decide the final choice |
| Scope page | `src/packet/pages/scope.tsx` | Shows the narrative above the existing list when one is supplied. The list stays as the fallback |
| Demo commands | `npm run extract -- J-03`, `npm run ask -- J-03`, `npm run scope -- J-01` | Run one call on a test job and print the result in plain language next to the expected answer. `npm run packet -- J-01 --narrative` puts a saved narrative into the packet |
| Evals | `npm run eval` | Runs every description through the real API and writes the eval report (below). Costs money, so it's never part of `npm test` |

New dependency: `@anthropic-ai/sdk` (the official Claude library). The key comes from `ANTHROPIC_API_KEY` and is never committed.

## How each call works

### 1. Extract

- **Every fact must be answered, as a value or `unknown`.** Instead of letting the model skip facts, the output format requires it to fill in each one, so "I don't know" is a deliberate answer rather than an omission. The prompt's main rule is "if the description doesn't say it, answer `unknown`; never infer it." Example: J-03 says "bigger window," which doesn't say whether the opening changes, so `window.action` must be `unknown`.
- **Work that doesn't fit any item kind is returned separately**, word for word (for example "build a deck"). It's never forced into the nearest kind. The app will treat it like an item that matches no rule: "can't classify this, call the office" (design doc §4.2). No rules change.
- **Names in the description** ("Northside is doing it") are returned as written. Plain code matches them to the subcontractor directory; the AI never sees the directory.

### 2. Phrase questions

- The engine picks the questions (as now). The AI only writes the wording, given the item's label, the fact, and its allowed values.
- The answers map back to the engine's fixed values, so a reworded question can't change what an answer means.
- **If the call fails or its answer fails the checks, a plain built-in wording is used** ("Shower: action? Replace same / Add / Relocate / Don't know"). Clunky, but the job can still go ahead.

### 3. Write scope

- Input is only the confirmed facts and the determinations: no owner name, address or license details (the page header already prints those from local data).
- The narrative comes back sentence by sentence, each tagged with the work items it describes. That lets plain code check it (below).
- The contractor edits and approves it before printing (in the M4 screen). The packet builder takes the approved text as an input, so building a packet still never calls the API and stays repeatable.

**If the API isn't available at all** (no key, no network, the model declines), every call fails with a clear message and has a manual path: facts can be entered by hand (M4), questions use the built-in wording, and the scope page uses the list. The AI is never required to get a packet.

## The checks (plain code, run on every AI answer)

| Call | Check |
|---|---|
| Extract | Output passes the fact schema; every item's facts use allowed values; no costs that aren't in the description (every dollar figure must appear in the text) |
| Extract (quotes) | Every quote attached to an unknown fact appears word for word in the description |
| Phrase | Exactly one question per key the engine asked for, no extras; every allowed value has an answer label, plus "Don't know"; every cost question asks for one dollar amount and says an estimate is fine |
| Scope | Every permitted work item is mentioned; every sentence points to real work items; every number, size and dollar amount in the text appears in the confirmed facts; no tier, form or code section the engine didn't produce |

A failed check counts as a failure in the evals. In the app, extract and scope get one automatic retry with the check's message, then fall back to the manual path.

## Evals and targets (for your approval)

**Inputs.** The 13 test descriptions, each run 3 times per model. Plus about 10 **new eval-only descriptions** I'll write for your approval, aimed at likely mistakes: tempting guesses ("new window" with no size), a job outside v1 scope (a deck), costs given as a range, a vague "the usual electrical," and owner-does-trade wording. These have no expected determinations, only "these facts must stay unknown" and "this must be flagged."

**How extraction is scored.** The AI may split or label items differently from the answer key, so items are first matched by kind and facts. Then:

| Measure | What it means | Proposed target |
|---|---|---|
| **Guessed facts** | A value where the answer key has `unknown` | **Zero, across every run** |
| Wrong facts | A value that differs from the answer key | Zero |
| Missed facts | `unknown` where the description stated it (shows up as an unnecessary question) | At most 1 per job, on average |
| Same questions | The engine asks the expected follow-ups for the extracted facts | Every job, every run |
| Same result | After answering the expected follow-ups, the determinations match the approved test result exactly (tier, rule per item, forms, signers, zoning, plans, tips, flags, form entries) | Every job, every run |
| Costs | Stated amounts extracted exactly | Every job |
| Not-covered work | Out-of-scope work returned separately, not forced into a kind | Every eval-only case |

**Questions and scope** are scored on the checks above (target: all pass, every run) plus your reading. The report prints every question for the 13 jobs and the narratives for J-01, J-04, J-08 and J-11 side by side across models.

**Model choice.** The eval runs each call on Haiku 5.5, Sonnet 5.5 and Opus 5.5 and reports the score and cost per job for each. I'll recommend the cheapest model that meets every target for each call. At list prices one job (all three calls) costs about half a cent on Haiku, roughly 10–15 cents on Sonnet and 25 cents on Opus. A full eval run across all three models is roughly $10–30; reruns on a single model while fixing prompts cost much less. The report will show the actual figures.

## Tests (offline, written first)

`npm test` must keep working without a key or network, so the API is never called from it:

1. **Checks:** each check catches a hand-made bad answer (a guessed fact, an invented cost, a missing question, a sentence about an item that doesn't exist, an invented number in the narrative).
2. **Item matching** used by the eval scorer, on hand-made cases.
3. **Recorded answers:** a saved API answer per call for a few jobs, replayed through the parsing, checks and engine, so a code change can't silently break the path from AI answer to determinations.
4. **Fallbacks:** built-in question wording for every fact in the schema; packet built with and without a narrative.
5. **Nothing private sent:** the request built for each call contains no profile, license, FEIN or owner contact details.

Existing tests stay unchanged. Adding the narrative to the scope page is the only packet change, and the current read-back tests cover the case without one.

## Decisions in this plan (my recommendations)

1. **The description is sent as typed.** It may contain names ("for the Morenos"); that's the contractor's own text, and design doc §5 already sends it. Everything from the profile and directory stays local.
2. **Score the worst of 3 runs, not the best**, because a contractor only sees one run.
3. **Guessed facts are a hard stop**, even if everything else scores well. A guess is the one mistake the contractor might not catch when confirming.
4. **The scope narrative is short and factual**: what's being done, where, by which trade, with the sizes and counts given. No sales language, no code citations (the forms carry those).
5. **Eval-only descriptions need your approval** before they count, like the test jobs. If an approved test job's expected facts look wrong while I build, I'll stop and ask you, not change it.

## Changes after approval (owner decisions 2026-10-26)

**The goal of the Q&A:** `unknown` after extraction isn't an end state. It means "ask the contractor." A box the applicant is responsible for (work type, cost by subcode, quantities) is left blank only if the contractor answers "Don't know," and then the cover checklist says who fills it in. The only other blanks are office-use boxes (CQ-10) and the sizes and details the sub completes on their own section (CQ-08); both are unchanged.

1. **Questions refer to what the contractor wrote.** For each fact it leaves unknown, extract also returns the exact words from the description that relate to it, if any (E-01: "a new window over the tub"; E-03: "Somewhere around $14–16k"). Plain code checks that each quote really appears in the description. The quote is passed to the question call as context and never becomes a fact. Example for E-01: *"You mentioned a new window over the tub. Is the opening new, is an existing opening being made bigger, or is the window being replaced in the same opening, unchanged?"*
2. **Cost questions ask for one amount.** Every cost question says the application needs a single estimated dollar amount, and that an estimate is fine. That's true with or without a quote, and in the built-in wording too. An approximate single figure in the description ("about $3,500", "~$16k") is already a stated cost and isn't asked again; a range or no figure is. The contractor chooses the figure. The app doesn't suggest the low or high end. For M4: the answer box takes one number, not a range.
3. **Follow-ups continue in rounds until the engine has nothing left to ask.** An answer can make another fact matter. Checked on E-04: the first round asks whether "the usual electrical" adds anything (and, with change 4, how many devices); only after "yes, it adds" does the engine ask whether it's on a new circuit. The app re-runs the engine after each round. Most jobs should need one or two.
4. **Counts that go on a form are always asked (engine change).** Today the engine asks only about facts that change the determinations (M1 plan, decision 2). That misses one case. In E-04, if the contractor says the electrical adds a new circuit, the job is a full permit whatever the device count, so no question is asked, and F120's Devices line prints blank with no note. Change: question selection also asks for any unknown count that feeds a form quantity line (CQ-07). I checked all approved test jobs: none leaves such a count unknown, so no approved expected question changes. Sizes stay with the sub (CQ-08, no question).
5. **"Don't know" on a count is put on the cover checklist** (rules data change). The count box stays blank, and the cover checklist adds "fill in the {line} count" for that section's signer, the same way missing sizes are handled now (CQ-08). This adds a line to rule CQ-07, so it goes into the rules table's "Changes after approval" and `docs/rules-reference.md` is regenerated.

New offline tests for these: the quote check catches a made-up quote; the cost wording check catches a question that allows a range; question selection asks for E-04's device count once a new circuit is confirmed; a "Don't know" count adds the cover checklist line; and a multi-round run on E-04 ends with no questions left and no blank box without a note.

## What you need to provide

An Anthropic API key in `ANTHROPIC_API_KEY` for the eval runs, and OK to spend roughly $10–30 per full three-model eval run (estimate; I'll report the real cost after the first run).

## What you'll review at the end

- **The eval report** (`docs/reports/m3-eval-report.md`): scores against each target, per model, with cost, and every failure shown with the description text next to what the AI answered.
- **Sample questions** for all 13 jobs and **sample narratives** for J-01, J-04, J-08 and J-11, plus the J-01 packet with its narrative.
- The prompts in `src/ai/prompts/`.
- My model recommendation per call.

## How it's done

On a branch, `m3-ai-layer`. First the eval-only descriptions for your approval, then the checks and offline tests (all failing), then the three calls until the tests pass, then the eval runs and prompt fixes until the targets are met (or I bring you the gap), then the report. After your review, merge to `main`.

## Build notes (2026-10-26; accepted by the owner 2026-10-26)

**Status.** Built on `m3-ai-layer`, evals run, every target met by Sonnet 5.5 on all 13 test jobs and all 10 eval-only descriptions, 3 runs each (`docs/reports/m3-eval-report-sonnet-final.md`). 414 offline tests pass. **Accepted by the owner (2026-10-26)** after reviewing the reports, sample questions and narratives, and the J-01 packet with its narrative.

**Model recommendation: Sonnet 5.5 for all three calls** (the current setting in `src/ai/config.ts`). From the three-model comparison (`docs/reports/m3-eval-report.md`, run before the last prompt fixes):
- **Haiku** fails several targets on every call: about 1 answer in 6 was unusable (bad values or missing facts), and its question wording missed the description quote on 5 of 9 follow-ups. It would save about 2 cents a job.
- **Opus** infers more than the description says (a guessed hood airflow increase, a dropped quote on E-03) and costs twice as much as Sonnet (about 4 cents a job against 2).
- **Sonnet** never guessed. Its remaining misses were all gaps in the instructions, fixed below.

**Eval history** (about $16 spent on API calls in total, including about $2 on a run stopped when the answer key changed):
1. First full run: Sonnet missed only a fuel and a bedroom guess. The question call worded `detached_2f` as "two stories". Fixed by sending a plain meaning with every question and answer value (`src/ai/meanings.ts`; a test requires one for every askable fact). Owner decisions 8 to 11 in `docs/test-jobs-v1.md` corrected the answer key (J-02, J-03, J-08, J-09, J-13).
2. Second full run, against the corrected key: Sonnet still left the sink out of "replace the vanity" (J-02), made a work item out of "electrical $600" (J-10) and put "3-ton" in a kilowatt size (J-13). Fixed with general rules in the extraction prompt: a vanity includes its sink unless only the cabinet is named; "same plumbing" means no upsizing; a trade cost isn't a work item; only kilowatts go in `kw`; "a new pad" isn't the same location; equipment that burns no fuel has no fuel change.
3. Sonnet recheck: E-04 ("full gut") failed because the AI answered `unknown` for the wall material, a fact the engine defaults to drywall. `unknown` for a defaulted fact now means the default, as it does in a job file.
4. Final Sonnet run: every target met. The one remaining miss, J-10's range fuel change, is never asked (it doesn't change the result).

**Saved answers.** After money was spent on runs that had to be redone, every answer the eval buys is now saved (`src/ai/eval/saved.ts`, in `out/eval/answers/`) and reused when the same request comes again. `npm run eval -- --rescore` re-grades the saved answers without calling the API and lists any that are missing with their cost; changing the answer key or the scoring now costs nothing. Only a full three-model eval writes `docs/reports/m3-eval-report.md`.

**What's built:** the three calls (`src/ai/extract.ts`, `questions.ts`, `scope.ts`), their prompts (`src/ai/prompts/`), the checks (`src/ai/checks.ts`), follow-up rounds (`src/ai/flow.ts`), the eval scorer (`src/ai/eval/`), the ten eval-only fixtures (`tests/ai/eval-jobs/`), the commands `extract`, `ask`, `scope`, `eval` and `packet --narrative`, the narrative on the scope page, and changes 4 and 5 in the engine and rule data (CQ-07).

**Found while building** (flag any you disagree with):

1. **The Claude library's shortcut for output formats drops the allowed values.** It turns each list of allowed values into a description, so the API wouldn't enforce them. The app sends the format directly instead, so the model can only answer with values the engine knows. The answer is still checked again afterwards.
2. **E-04 asks for the device count in round 1, not round 2.** With change 4, the count goes on F120 whatever the other answers, so it's asked right away; round 2 then asks about the new circuit. `docs/eval-jobs-m3.md` and change 3 above are updated to match. Expected follow-ups for the approved test jobs are unchanged.
3. **Some conventions in the extraction prompt come from the approved answer key.** Examples: the wiring for a condenser belongs to the condenser item (J-09), and a new bedroom gets a smoke/CO alarm item even if the description doesn't mention one (J-05). They're written as general rules, not per-job, but it means the 13 test jobs are partly "seen" by the prompt. The ten eval-only descriptions are the check against that.
4. **Automatic retry on a different model is off.** The API can retry a declined request on another model. It's off because the eval needs to know which model answered; a declined request takes the manual path instead. Declines are unlikely for this kind of text.
5. **Costs in the report are estimates** from list prices, counting cached prompt reads at a tenth of the input price.

