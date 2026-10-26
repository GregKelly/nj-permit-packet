# Plan: Homeowner does their own trade work

*Status: Approved by Gregory Kelly, 2026-10-26 · Rules addendum and test jobs approved 2026-10-26 · Replaces the LC-05 stop · Follows design doc §9 (plan → approval → rules-first → build)*

## Goal

Handle a contractor's job where the homeowner does one or more licensed trades themselves (for example, the contractor does the kitchen and the owner does the electrical). When the law allows it, the app produces a correct packet with the owner signing that trade's section as an exempt applicant. When the law doesn't allow it, the app explains why and says to assign a licensed sub. Done when the new rules and test jobs are approved by you and the tests pass.

This step is rules-first, like M1: this plan, then a rules-table addendum and test jobs for your review, then the build.

## What the state says

**The UCC gives a general exception and defers to each trade's law.** N.J.A.C. 5:23-2.15(b)2.i: plumbing, electrical and HVACR work "shall not be undertaken except by persons licensed to perform such work pursuant to law, except in the case of a single-family homeowner on his or her own dwelling." When DCA adopted that wording (52 N.J.R. 10(1), 2020), it said the trade laws are more specific and "the code user must apply that exception within the scope of the laws and rules applicable to each specific trade."

**The three trade laws don't match:**

| Trade | Law | Homeowner exemption covers |
|---|---|---|
| Electrical | N.J.S.A. 45:5A-18(n) | "a dwelling that is occupied solely as a residence for himself or for a member or members of his immediate family." Doesn't say single-family |
| Plumbing | N.J.S.A. 45:14C-12.4; N.J.A.C. 13:32-1.4(f)1 | "a single family home owner who performs plumbing work on his own dwelling" |
| HVACR | N.J.S.A. 45:16A-9; N.J.A.C. 13:32A-1.1(b)3 | a single-family owner "who personally occupies his own dwelling and who solely performs HVACR work on his own dwelling," **except** work involving CFC or HCFC refrigerants, which needs a licensed Master HVACR contractor |

**DCA asked each licensing board to apply its law to specific home types** ("License Check," *Construction Code Communicator*, Vol. 31 No. 1, Spring 2019, pp. 6–7). For the home types the app handles:

| Owner owns **and lives there** | Plumbing | HVACR | Electrical |
|---|---|---|---|
| Single-family detached (`detached_1f`) | Yes | Yes, no CFC/HCFC work | Yes |
| Two-family (`detached_2f`) | **No** | **No** | Yes |
| Attached single-family, e.g. a twin (`attached`) | Yes only with **its own sewer**; no if the sewer is shared | Yes | Yes |
| Owner doesn't live there (any type) | No | No | No |

The same article tells code officials to "ask the appropriate questions," take the applicant at their word, and report false statements to the board. So the office relies on what the packet certifies. That's why the app should refuse to certify a trade the owner isn't allowed to do.

**What the forms provide:**

- F100 page 2, **Owner Section** (used when the owner is the applicant): box C "I will perform or supervise" with C.1 Building and C.2 Fire Protection, then "I will perform the following work" with C.3 Electrical and C.4 Plumbing. Box D: "advise all contractors... registered with the NJ Division of Taxation." **There is no mechanical/HVACR box** (the form is rev. 11/2014).
- F120, F130 and F145: an **"Exempt Applicant"** box beside "Licensed Contractor" under the signature. All three are already in the field maps from M2.
- An owner working on their own one- or two-family home needs no HIC registration (5:23-2.15(b)8.ii).

**Two points from town guidance, not state text:** nearby towns (Ridgefield Park, Verona) say the owner must do the work **personally**, with no help from friends, relatives or a handyman. The HVACR statute says "solely performs." Ridgefield Park also says owner-occupied two-family homes need licensed electricians, which contradicts the Electrical Board's answer above. Maplewood publishes nothing on this.

Sources are in `docs/research-notes.md` under "Homeowner trade work." The statute text came from mirrors (onecle, FindLaw, Cornell LII), so confirming against the official text is part of the assumptions below.

## How the path works for the contractor

1. During job entry, for each licensed trade on the job (electrical, plumbing, HVACR), the contractor says who does it: a sub from the directory, or the owner.
2. If the owner does any trade, the app asks: **does the owner live in the home?** If the home is attached and the owner does plumbing, it also asks: **does the home have its own sewer connection?**
3. The rules check each owner-performed trade against the table above:
   - **Allowed:** the packet is built with the owner as applicant and signer of that section.
   - **Not allowed:** printing is blocked. The flag says why, in plain words, with the law cited, and tells the contractor to assign a licensed sub for that trade.
   - An answer of "don't know" counts as not allowed (the usual conservative branch).

## Rules to add (rule data, for your review as a rules-table addendum)

| ID | Rule |
|---|---|
| HO-01 | The owner must live in the home for any owner-performed trade. For electrical only, an immediate family member living there also counts. Otherwise: block, "assign a licensed {trade}" |
| HO-02 | Plumbing by the owner: `detached_1f`, or `attached` with its own sewer. Two-family or a shared sewer: block ⚠️ A-26 |
| HO-03 | HVACR by the owner: `detached_1f` or `attached`. Two-family: block ⚠️ A-26 |
| HO-04 | HVACR by the owner may not include refrigerant work (A/C condenser, heat pump, mini-split). Block that item and say a licensed HVACR contractor must do it. Furnace, boiler, water heater and ductwork are fine ⚠️ A-24 |
| HO-05 | One signer per section. If the owner does some of a trade and a sub does the rest, block: "one person must do all the {trade} work on this permit" |
| HO-06 | Electrical by the owner: any one- or two-family type the app handles, if HO-01 passes ⚠️ A-23 |
| LC-05 (narrowed) | Now only for the owner doing **building-section** work on a contractor's job. Still a stop (see "Not in this step") |
| LC-02 | Not raised for a trade the owner does |
| HO-T1 (checklist line) | "You must do this work yourself. Friends, relatives or a handyman can't do it under your exemption." |

**New facts:** who does each trade (`performed_by` becomes per trade instead of one value per job), `owner_occupied` (yes / no / unknown), and `own_sewer` (asked only for an attached home where the owner does plumbing). Whether an HVAC item involves refrigerant comes from its kind, so there's no extra question.

**New assumptions:**

- **A-23.** Eligibility follows the 2019 licensing-board answers, including the Electrical Board's view that an owner living in a two-family home may do their own electrical. Confirm with the Maplewood electrical subcode official, since at least one town reads it the other way.
- **A-24.** The owner may not do **any** refrigerant work, not just CFC/HCFC work as the law says. Today's refrigerants aren't CFC/HCFC, so the literal reading would allow owner A/C installs. Federal refrigerant-handling rules may still apply, and a reviewer would likely push back. This is the conservative reading. Confirm with the HVACR Board.
- **A-25.** The statute text matches the mirrors we read. Confirm against the official NJ statutes and N.J.A.C., as with A-1.
- **A-26 (configurable).** An owner living in a two-family home may **not** do their own plumbing or HVACR work. This follows the plain "single family" wording in both laws and the 2019 board answers. It's a switch in the state rule data (`two_family_owner_plumbing_hvacr: false`), like the Maplewood zoning switches. Flipping it to `true` lets HO-02 and HO-03 allow two-family homes with no code change. Confirm with the Plumbing and HVACR Boards (Q-16).

## What changes in the packet

1. **The owner becomes the F100 applicant.** F100 has a single applicant: either the Owner Section or the Agent Section is signed. The owner's "I will perform the electrical/plumbing work" certification only exists in the Owner Section, so when the owner does any trade, the Owner Section is used:
   - C is checked, plus C.3 and/or C.4 for the trades they do. C.1 is left unchecked because the contractor does the building work.
   - D is checked, since contractors are on the job.
   - The Agent Section is left blank, and the contractor stays on page 1 as Principal Contractor.
2. **The owner authorization page is dropped** in that case. It's redundant once the owner signs F100 themselves.
3. **On each owner-performed section:** "Exempt Applicant" is checked. The contractor block gets the owner's name, address and contact details. The license box reads "Exempt: homeowner, N.J.S.A. 45:5A-18(n)" (or that trade's citation), and the HIC box reads "Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii". The owner signs the section.
4. **Contractor sections are unchanged.** F110 and any sub-signed sections work as today.
5. **Cover checklist:** the owner gets a "Who signs where" row for F100 and each exempt section, plus the HO-T1 line. An HVACR owner also gets a note that F100 has no mechanical box, so F145's Exempt Applicant box is their certification (Q-13).

## Test jobs to add (expected outputs drafted for your approval)

- **J-11 · Kitchen, owner does the electrical.** A detached single-family home the owner lives in, based on J-01. Expected: F100 Owner Section with C, C.3 and D; F120 exempt and signed by the owner; F110 signed by Hollis; no owner authorization page; no Watts Electric.
- **J-12 · Two-family basement, owner wants to do electrical and plumbing.** The owner lives in one unit. Electrical is allowed; plumbing is blocked by HO-02 with the reason.
- **J-13 · Twin, owner swaps the furnace and A/C.** The owner lives there. The furnace is allowed; the A/C is blocked by HO-04. If a licensed sub takes the A/C, HO-05 blocks (two signers on F145) until one HVACR contractor takes both.
- **Unit cases:** J-12 with A-26 flipped (plumbing then allowed); the owner doesn't live there (HO-01); "don't know" on occupancy; an attached home with a shared sewer and with its own sewer (HO-02 both ways); an immediate family member living there for electrical; the owner doing building work (narrowed LC-05 still stops); the field read-back for J-11's F100 Owner Section and the F120 exempt box.

## Decisions in this plan (my recommendations)

1. **One permit, owner as applicant**, rather than a separate permit for the owner's trade. It's one job, and the forms support it. Confirm with the office (Q-12).
2. **Block, don't warn, when the owner isn't eligible.** Unlike an expired license (LC-03), there's no correct packet to print: the app would be certifying exempt work the law doesn't allow, and the office relies on that certification.
3. **Per-trade, not per-item:** each section has one signer, so the owner does all of a trade or none of it (HO-05).
4. **Conservative on refrigerants** (A-24).

## Questions for the Maplewood Construction Office (added to the call list)

- **Q-12.** When the owner does one trade and a contractor does the rest, is it one application with the owner as applicant, or a separate permit for the owner's trade?
- **Q-13.** F100's Owner Section has no mechanical box. For owner HVACR work, is F145's "Exempt Applicant" box enough, or do they want something written in?
- **Q-14.** What estimated cost goes on an owner-performed section: materials only, or materials plus the value of the labor? Until answered, the app uses the cost the contractor enters for that trade, and the cover checklist asks them to confirm.
- **Q-15.** Do they follow the Electrical Board on two-family homes (A-23)?
- **Q-16.** Can an owner who lives in a two-family home do their own plumbing or HVACR work (A-26)? Ask the Maplewood plumbing subcode official. For a definitive state answer, ask the Board of Examiners of Master Plumbers and the HVACR Board (Division of Consumer Affairs), or DCA Code Assistance at (609) 984-7609. Ask whether the 2019 "License Check" answers still stand.

## Not in this step

- **The owner doing building-section work** (F110) on a contractor's job. That's a "perform or supervise" role that changes who's responsible for the whole job, so it stays a stop with an explanation.
- **Owner-prepared plans** (F100 box B, 5:23-2.15(f)1.ix(1)). Plans stay flagged as today.
- **A homeowner using the app on their own job** with no contractor. The primary user is still the contractor.

## How it's done

On a branch, `homeowner-trade`:

1. Write the rules-table addendum (§4.7 and the new assumptions) and J-11 to J-13 with expected outputs. **Stop for your review.**
2. After approval, write the tests (all failing), then the rule files, engine changes and packet changes until they pass.
3. Regenerate `docs/rules-reference.md`, add the demo (`npm run packet -- J-11`) and the test report, and bring it to you to accept before merging to `main`.

If an approved expected answer turns out to be wrong, I'll stop and ask rather than change it.

## Notes for the build

**Status (2026-10-26).** Step 1 is done and approved: rules table §4.7, assumptions A-23 to A-27, questions Q-12 to Q-16, and test jobs J-11 to J-13 with variants and unit cases. The build (step 2) starts from those approved docs.

- `tests/rule-files.test.ts` fails until the rule files have the new IDs. Its pattern for row IDs (`KB|FB|RF|HV|ZN|PL|CQ|LC|TP|A`) also needs `HO` added, so the HO rules are checked too.
- A-23 and A-26 are switches in the **state** rule data, since they're state law, not Maplewood config.
- `performed_by` moves from one value per job to one per trade. Existing fixtures default to the contractor, so J-01 to J-10 shouldn't change. If one does, stop and ask.

## Build notes (2026-10-26)

**Status.** Built on `homeowner-trade`. All 344 tests pass (up from 218): J-01 to J-10 unchanged, J-11, J-12 and J-13 as written, variants J-12a and J-13b as full fixtures with field read-back, J-12b, J-13a and the eight unit cases in `tests/homeowner.test.ts`. Awaiting owner acceptance before merging to `main`.

**Decided by the owner (2026-10-26):**

1. **The HIC box is too small for "Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii".** Each form gets the longest wording that fits: F120 prints "Exempt: owner", F130 and F145 print "Exempt: owner, 5:23-2.15(b)8.ii". Recorded under "Changes after approval" in the rules table and the test doc (change 7).

**Interpretations made while building** (flag any you disagree with):

1. **How "who does each trade" is stored.** `performed_by` has one entry per trade (building, electrical, plumbing, mechanical), each `contractor` or `owner`. To express J-13a (the owner does the furnace, Clearair the condenser), a trade can also list the work items the owner does: `mechanical: { owner: [furnace] }`. The sub does the rest, and HO-05 blocks. The engine never asks who does a trade; in M3 the AI reads it from the description and the contractor confirms.
2. **Occupancy and sewer are property facts** (`owner_occupied`: yes / immediate_family / no; `own_sewer`: yes / no). The engine asks them only when the answer would change the result, so J-01 to J-10 never ask, and the sewer question only comes up for an attached home where the owner does plumbing.
3. **Signer names.** Owner-signed forms show "Owner" in the engine's results; the cover checklist prints the owner's name. A trade the owner may not do shows no signer.
4. **F370 goes with the HVACR trade.** When the owner may do the HVACR work, the owner signs F370 (HO-F4); when not, it has no eligible signer, like F145.
5. **F100 box D is always checked** when the owner is the applicant: the contractor is always on the job as Principal Contractor.
6. **One flag per blocked trade**, from the first check that fails, in the order HO-01 to HO-06. J-12 shows only HO-02; an owner who doesn't live in a two-family home and wants to do plumbing sees HO-01.
7. **The contract total doesn't include the owner's work** (from J-11's numbers: $42,500 contract, $39,000 building, $44,500 F100 total). So an owner-performed trade never takes "the rest of the total" (CQ-03), and its cost is always asked if it wasn't given. Written into HO-F5 in the rule data.
8. **Blocked jobs still show everything else** (forms, costs, quantities), worked out with the same rules. The test doc doesn't list form entries for J-12 and J-13 as written, so the fixtures say where those come from.
9. **Assumptions A-23 and A-26 (and Q-15, Q-16) are shown only for a two-family home**, or when the home type isn't known. A-24 shows whenever the owner does HVACR, A-25 and A-27 whenever the owner does any trade.
10. **The scope of work** says "done by the owner (homeowner exemption)" next to an owner-performed trade.

**Wording I wrote** (not in the approved table; please read):

- **HO-02, shared sewer:** "NJ plumbing law lets only a single-family homeowner do their own plumbing, and this home doesn't count because it shares a sewer line with the neighbor. Assign a licensed master plumber."
- **HO-04** ends at "...for all the HVACR work." as in J-13's expected answer, without the table's "(see HO-05)".
- **HO-06** only fails with A-23 switched off: "With assumption A-23 switched off, an owner in a two-family home can't do their own electrical work. Assign a licensed electrician."
- **"Don't know" answers** add one sentence to the message, e.g. "Assumed the owner doesn't live there because it wasn't known. Change it if you confirm otherwise." (same for the sewer and the home type).
- **Owner doing HVACR** gets a cover line: "F100's Owner Section has no box for HVACR work, so the Exempt Applicant box on F145 is your certification for it. Ask the construction office whether they want anything written in (Q-13)."
- **Cover checklist "where to sign":** F100 "Page 2, Owner Section: Signature (boxes C, D and the box for each trade you do are already checked)"; exempt sections "Section C: Sign here, Print name here (Exempt Applicant is checked; no seal)".

**Polish noticed, not fixed:** J-11's and J-13b's cover checklists run one or two lines onto a second page. The new owner lines made the page longer.

**Review material:** `npm run packet -- J-11`, `J-12a`, `J-13b` (packets); `npm run packet -- J-12` and `J-13` (no packet, the reason only); `npm run determine -- J-12` (what the engine decided, in plain language); [homeowner-test-report.txt](../reports/homeowner-test-report.txt); the new section 8 of [rules-reference.md](../rules-reference.md).
