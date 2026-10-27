# M4 Plan: The app

*Status: Approved by Gregory Kelly, 2026-10-27 · Design doc §3 (architecture), §5 (flows) and §9, milestone M4*

## Goal

Put everything built so far behind a local web app a contractor can use: set up their profile and subcontractors once, then go from address and description to a printed packet on four screens. Done when a test job runs end to end in the app, and you time a full run-through at under 10 minutes (the brief's definition of done).

No new rules and no new AI calls. The app connects the pieces that already exist (engine, AI calls, packet builder) and adds the three that don't: the parcel lookup, saved data, and the screens.

## What I found before planning

- **The pieces fit together already.** The commands `npm run ask`, `scope` and `packet` already chain extract → questions → engine → narrative → PDF. The app's server code does the same steps, in the same order, from screens instead of a terminal. The follow-up rounds (`src/ai/flow.ts`) and the matching of names to the subcontractor directory (`src/ai/extract.ts`) are ready to reuse.
- **The parcel service still works** (checked today against Oakview Ave). It writes street types in full ("8 OAKVIEW AVENUE"), so "Ave" must be expanded before searching, and the house number matched afterwards.
- **What the parcel record can and can't tell us** (field definitions in `docs/research-notes.md`, from the Treasury's MOD-IV guide):
  - *Home type.* The approved test jobs treat home type (detached one-family, detached two-family, attached, three or more homes) as a property fact supplied up front with block and lot, not read from the description. Left unknown, the engine asks it on every job, because "three or more homes" stops the job (SC-01). The record can't supply it outright: property class 2 covers every residential home, and its `DWELL` field counts dwelling units (1, 2, 3 or 4 in Maplewood) but can't tell a detached house from a twin. So the contractor picks the home type on the Describe screen, with the record's unit count shown beside it as a check. No rule change.
  - *The work site's ZIP code.* The record's `ZIP_CODE` and `CITY_STATE` are the owner's mailing address, not the property's (21 Nelson Place, Maplewood is listed as Essex Fells 07021). The record has the street address but no ZIP. So the work-site ZIP comes from the address the contractor types, like the rest of the address; the lookup confirms the street, block and lot.
- **Year built is shown but not used.** No rule reads it. It's useful to the contractor (an old house hints at lead paint and knob-and-tube), so it's displayed, nothing more.
- **The design doc's "lint rule" keeping the engine separate was never built.** With the app adding many new imports, now is when it matters (decision 8).
- **Your machine runs Node 26**, which includes SQLite built in (decision 9).

## The screens

Plain, readable pages; no styling framework. Every screen works without the AI (the "manual path" from the M3 plan).

**Setup (once, editable any time)**
- **Your business:** name, address, phone, email, HIC registration, FEIN, builder license if any. This fills the applicant and agent boxes on every form.
- **Subcontractors:** trade, company, license number and expiry, address, phone, email. Mark one per trade as your usual. An expiry within 30 days is highlighted; an expired one shows the same warning the packet prints (LC-03).
- **Home:** your saved jobs, newest first, each with its status ("questions open", "ready to print", "printed"). Click one to pick up where you left off.

**1. Describe the job**
- Work-site address (street, town, ZIP) → the parcel lookup shows the matching properties (address, block, lot, qualifier, class, year built). You pick one. If nothing matches, or the service is down, you type block and lot yourself.
- Home type: detached one-family, detached two-family, attached (twin or townhouse), or three or more homes. The tax record's unit count is shown beside it ("Tax records: 2 dwelling units") as a check, not a pre-filled answer. If the choice disagrees with the record (two-family picked, record says 4 units), the screen says so before you continue; your answer is what counts. "Three or more homes" stops the job as out of scope (SC-01, unchanged).
- Owner name, mailing address, phone (the parcel data hides owner names).
- The job description, as you'd write it.
- "Next" sends only the description to the AI (as today), and the app runs the engine on what comes back.

**2. Answer a few questions**
- The engine's open questions, in the AI's wording, with "Don't know" on every one. Cost questions take one dollar amount.
- After you answer, the engine runs again. If an answer opens a new question, another short round appears on the same screen (M3 plan, change 3). When nothing is left, you move on. Jobs with no questions skip this screen.
- Names from the description that don't match your directory ("Bob's Electric") are asked here: pick a sub, add a new one, or say the owner is doing it.

**3. Review**
Two halves, side by side on a wide screen, stacked on a narrow one:
- **What we understood:** each work item in plain words with its facts, the costs by trade, who does each trade. Every one is editable. You can add or remove items: pick a kind, then fill in the fields the fact schema defines for it (the same definitions the AI and engine use). This editor is also the manual path when the AI is unavailable.
- **What that means:** permit or minor work or no permit, and why; each item's rule and reason; required forms and who signs each; zoning; plans; warnings; tips; and the assumptions this result relies on, each with how to confirm it. Every edit on the left re-runs the engine and updates the right immediately (the engine is fast and needs no network).
- If an edit creates a new unknown that matters, its question appears here inline.
- Anything the AI couldn't fit into a work item ("build a deck") shows at the top as "Not covered by this app — call the office" (decision 3).
- "Confirm" is the contractor's sign-off on facts and determinations. Nothing reaches the packet before it.

**4. Print**
- **Scope of work:** the AI drafts the narrative from the confirmed facts. You edit it in place and approve it, or skip it and use the plain list.
- **The packet:** shown in the page, with a Download/Print button. The cover checklist is first, as now.
- Going back and changing a fact clears the confirmation and the narrative approval, so a packet can't mix old and new facts.

## What gets built

| Piece | Where | What it is |
|---|---|---|
| The app | `app/` | Next.js pages for the screens above, and server routes that call everything else. The API key stays on the server, never in the browser |
| Job service | `src/jobs/` | The steps each screen triggers (start a job, apply answers, edit facts, confirm, write scope, build packet), as plain functions. The screens are thin; this is what the tests drive |
| Parcel lookup | `src/parcel/` | Address in → candidates out. Expands abbreviations (Ave → Avenue, St → Street), searches by the town name and street as typed, then matches the house number, including ranges like "489-91". Results cached locally |
| Saved data | `src/db/` | Profile, subcontractors, jobs and the parcel cache in one local SQLite file, `data/permit-packet.db` (not committed). Plain SQL |
| Start command | `npm run app` | Starts the app at `http://localhost:3000`, reachable only from this computer |

New dependency: `next` (the app framework the design doc picked; React is already installed).

**What each saved job holds:** the description, the AI's extraction, every answer (including "Don't know"), the confirmed facts, the team, the owner and site details, the approved narrative, the date the packet was prepared, and the rules version. That's enough to rebuild exactly the same PDF later, and to trace it to the rules that made it (design doc §4.3).

## Tests (offline, written first)

`npm test` keeps working without a key or network.

1. **The app gives the same answer as the commands.** All 13 test jobs go through the job service using the saved AI answers (`tests/ai/recordings/`) and the approved follow-up answers. Each must end with exactly the approved determinations, and, for the nine permit jobs, a packet whose fields read back identical to the M2 tests. This is the main test: the screens can't change a result.
2. **Manual path:** J-01 with its facts typed into the editor, no AI at all, gives the same packet.
3. **Parcel lookup:** abbreviations, ranges, unit numbers, no match and several matches, on saved responses from the real service (including 21 Nelson Place, 4 units). The record's unit count is passed through; a home type that disagrees with it is pointed out; the owner's mailing ZIP is never used as the site ZIP. Plus one test that the service being down gives a clear message and the manual block/lot boxes.
4. **Saved data:** profile and subs save and load unchanged; the test profile entered through the app produces the same packet as `tests/jobs/_profile.yaml`. A saved job reopened rebuilds a byte-identical PDF.
5. **Guardrails:** no packet before Confirm; editing a fact after Confirm clears it and the narrative approval; a job saved under an older rules version says so and asks for a fresh review; an expired license warns and still prints (LC-03).
6. **Nothing private sent:** a full job through the app sends the API only the description and facts, never the profile, directory, owner details or FEIN (extends the M3 test).
7. **Engine stays separate:** a test fails if anything in `src/engine/` imports from outside it.

## Decisions in this plan (my recommendations)

1. **Facts are confirmed on the Review screen, next to what they mean**, not on a separate screen before it. Seeing "this makes it a full permit" next to "bearing wall: unknown" is what makes a contractor check that fact. Four screens, as the design doc lists.
2. **The scope narrative is written on the Print screen**, after Confirm, because it's written from confirmed facts only (M3 plan).
3. **Work the app can't classify blocks the packet until it's dealt with.** The contractor can reword it into a supported item, or remove it. If removed, the cover checklist lists it under "Not in this packet: ask the construction office," so it isn't silently dropped. This adds one section to the cover checklist page; nothing else in M2's pages changes.
4. **One user, no login, this computer only.** Hosting and multiple users are non-goals (design doc §1).
5. **"Today" comes from the computer's clock in the job service, and is saved with the job.** The engine and packet builder still never read the clock, so a saved job reprints identically.
6. **When the rules files change, open jobs are re-run and marked "rules changed, review again."** Printed jobs keep their old result and rules version, so you can always see what was printed and why.
7. **No browser-driving tests.** They need a browser install and break easily on layout changes. The tests above cover every result; before showing you, I'll run the full flow myself in Chrome and record it as a GIF for your process trail.
8. **The engine boundary is enforced by a test instead of a lint tool.** Same protection, one less tool to install and configure. This is a small change from the design doc (§3), recorded there.
9. **SQLite built into Node, instead of the `better-sqlite3` package.** Same database and same plain SQL, but nothing to compile on install (that package needs build tools on a new Node version). This changes one line of the design doc (§6), recorded there.

## Cost

Building and testing costs nothing: tests use saved AI answers. Each real run through the app on Sonnet costs about 2 cents (M3 eval figures). My own run-throughs plus yours should stay well under $1. No eval runs are planned.

## What you need to provide

Nothing new. The app uses the same `ANTHROPIC_API_KEY`; without it, the app still works through the manual path.

## What you'll review at the end

- **A timed run-through:** you enter J-01 (34 Oakview Ave, the Morenos' kitchen) from scratch, including setting up the profile and subs once, and time from address to printed packet. Target: under 10 minutes for the job itself.
- Two more jobs of your choice, ideally one "no permit needed" (J-02 or J-06) and one with a warning (J-08 with Northside).
- The GIF of my own run-through and the test report.

## How it's done

On a branch, `m4-app`. First the tests above (failing), then the parcel lookup and saved data, then the job service until the tests pass, then the screens, then my run-through in the browser and fixes. Then you review; after your OK, merge to `main` and update `CLAUDE.md`.

## Build notes (2026-10-27; awaiting the owner's review)

**Status.** Built on `m4-app`. Every screen in the plan works: Setup, Home (saved jobs), Describe, and the job page with Questions, Review and Print. `npm run app` starts it at `http://127.0.0.1:3000`, reachable only from this computer. 486 offline tests pass, including all 13 test jobs through the job service. Not yet done: your timed run-through and review.

**My run-through in Chrome (2026-10-27), J-01 with the real AI.** A GIF of it is in your Downloads (`m4-app-run-through-J-01.gif`, 6 MB; not committed because of its size).
- **Describe.** The lookup found 34 Oakview Ave (block 23.03, lot 213, built 1910, 1 unit) and filled in block and lot. Picking "two-family" showed the unit-count warning; one-family cleared it. Reading the description took about 40 seconds.
- **Questions.** Skipped: J-01's description answers everything the rules ask.
- **Review.** The result matched J-01's approved answer on every item, form, signer, zoning and plans line. Setting the wall to load-bearing changed it to a full permit (KB-21) with sealed plans within 2 seconds; setting it back restored both.
- **Print.** The AI's scope of work was drafted, approved, and the 9-page packet showed in the page. Earlier, the same job entered by hand printed a packet identical to `npm run packet -- J-01` except for the prepared date.

**Cost: about 7.5 cents a job, not the 2 cents this plan estimated.** That's the reading of the description plus the scope of work for J-01, as the app recorded it. I haven't confirmed why it's higher than the M3 eval figures. A likely reason is that the evals ran many jobs back to back and reused the cached instructions, while a single job pays full price for them. Your timed run plus a few more jobs still comes to well under $1.

**Found while building** (flag any you disagree with):

1. **The real block and lot for 34 Oakview Ave aren't the test job's.** The tax record says block 23.03, lot 213; the approved test packet uses a made-up 4101 / 7. The tests keep the made-up values; the app uses whatever the lookup finds, or what you type.
2. **Block and lot typed by hand.** The property class is set to "2" (residential), because the rules need one and only homes are in scope. Year built and the unit count are left blank, so no unit-count warning shows. If you change the block or lot after picking a tax record, the record's other details are dropped too.
3. **"Not a home" isn't offered as a home type** on the Describe screen. The plan lists only the four home types, and a non-home is out of scope anyway.
4. **Confirm takes you to Print.** It first stayed on Review, which looked as if nothing had happened.
5. **An approved scope of work can be re-opened to edit.** This keeps Confirm (the facts haven't changed) but clears the printed packet, so the next print uses the new wording. An empty scope of work can't be approved: the plain list has to be chosen on purpose.
6. **The packet is saved the first time it's shown** on the Print screen, which marks the job "Printed". After a rules change, the job asks for a fresh review, and the printed packet can still be opened as it was (decision 6).
7. **A bug found in the run-through.** The app kept one copy of the job service in memory, so code changes didn't apply until the app was restarted. It now makes a new one on each request (only the database connection is kept), so this can't happen again.
8. **The API key stays on your Mac.** It's read from the macOS Keychain when you open a Terminal (`~/.zshrc`), so the app must be started from your own Terminal. Only server code reads the key; nothing in the pages loaded in the browser can see it.
9. **Decisions 8 and 9 are now in the design doc** (§3 and §6). They were meant to be recorded there when this plan was approved, and weren't until now.
10. **`AGENTS.md` is committed.** `next dev` writes it on every start (it repeats the Next.js note in `CLAUDE.md`), so committing it keeps it from showing as a stray change.

**Before your timed run-through:** stop the app, delete the `data/` folder (it holds the test profile and my two test jobs), and start it again with `npm run app` from your own Terminal. Setup then starts empty, as the plan's timing assumes.
