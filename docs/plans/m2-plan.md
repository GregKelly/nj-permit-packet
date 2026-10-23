# M2 Plan: Packet builder

*Status: Approved by Gregory Kelly, 2026-10-23 · Design doc §9, milestone M2*

## Goal

Turn a job's determinations into the printed packet: the official DCA forms filled in, plus our own pages (cover checklist, owner authorization, scope of work), merged into one PDF in print order. Done when the field read-back tests pass for every MW/FULL test job (J-01, J-03, J-04, J-05, J-05b, J-07, J-08, J-09, J-10). No AI and no UI yet. The scope-of-work page uses a plain stand-in until M3 adds the AI-written narrative.

## What I found before planning

I downloaded the current fillable forms from the DCA forms page and opened them with pdf-lib, the library the design doc picked:

| Form | DCA file | Fillable fields |
|---|---|---|
| F100 Permit application (3 pages) | `ucc_f100_cpa.pdf` | 117 |
| F110 Building | `F110_bldg_fill.pdf` | 58 |
| F120 Electrical | `F120_elec_fill.pdf` | 94 |
| F130 Plumbing | `F130_plumb_fill.pdf` | 63 |
| F145 Mechanical | `F145_mech_fill.pdf` | 54 |
| F370 Chimney verification | `ucc_f370_chim_cert.pdf` | 60 |

All of them are standard fillable forms, so we can fill the official PDFs as planned. The catch is that **the field names are unreliable**. Many say nothing about where they are on the page (`QTYRow7`, `Check Box29`, `undefined_4`), and some are misspelled (`Ceck Box1`). So connecting our data to the right box can't be done by name alone. It has to be checked visually, once per form. That's the main manual work in this milestone, and it's why the "proof sheet" below exists.

## What gets built

| Piece | Where | What it is |
|---|---|---|
| Official forms | `assets/forms/` | The six DCA PDFs above, unchanged, plus `forms.yaml` recording each one's source URL, revision date, download date and a fingerprint (hash) of the file |
| Field maps | `assets/forms/F100.map.yaml` … | One file per form connecting our names (`block`, `est_cost`, `lines.devices`) to the PDF's field names (`Block`, `Est Cost of Elec Work`, `QTYRow7`). Readable, like the rule files |
| Proof sheet command | `npm run form-proof -- F120` | Prints a copy of a form with every box filled in with its own field name. This is how I build each map, and how you can check one: hold the proof next to the map file |
| Form filler | `src/packet/fill.ts` | Fills a form from the field map with pdf-lib, then flattens it (turns the fields into printed text so they print reliably and can't be edited by accident) |
| Our own pages | `src/packet/pages/` | Cover checklist, owner authorization, scope of work, and the "no permit needed" sheet, drawn with @react-pdf/renderer (the library the design doc picked) |
| Packet builder | `src/packet/build.ts` | `buildPacket(job, determinations, profile, today)` returns one print-ready PDF. Like the engine, it never reads the clock or the network |
| Test packet inputs | `tests/packets/J-01.yaml` … | For each MW/FULL job: the facts the forms need that the engine doesn't use (owner name and address, block/lot/qualifier) and the expected entry for each form field |
| Demo command | `npm run packet -- J-01` | Writes `out/J-01.pdf`, ready to print (`out/` isn't committed) |

New dependencies: `pdf-lib` (fill forms), `@react-pdf/renderer` and React (draw our pages), and `pdfjs-dist` for tests only (read the text back out of our own pages).

## What's in the packet, in print order

1. **Cover checklist** (for the contractor; marked "Keep this page, don't submit it"):
   - Job summary: address, block/lot, outcome (permit / minor work), forms included
   - **Steps in order.** For minor work, "Notify the construction office before work starts" first and "File this packet within 5 business days of the notice" second. Then the zoning permit and its checklist when it's required, or the "probably not required, confirm" note. Then plans needed.
   - **Who signs where:** each form, its page, the signer by name, and what they still fill in by hand (from the engine's fill-ins, e.g. "Watts Electric: fill in kW sizes for dishwasher and disposal")
   - What to attach (plans, zoning approval, survey)
   - Reviewer tips, and the assumptions this packet relies on, each with how to confirm it
   - Footer: prepared date and rules version, so any packet traces back to the rules that made it
2. **F100**, filled
3. **Owner authorization page**
4. **Technical sections** in form order: F110, F120, F130, F145, then F370
5. **Scope of work**

Jobs with no construction permit (J-02, J-06) get a one-page **"No permit needed"** sheet instead: each item, its rule and reason, plus any zoning note. Out-of-scope or unclassifiable jobs get no packet; the builder returns the reason instead.

## What goes on the forms

- **Engine entries**, exactly as M1 produces them: proposed work, cost by subcode, use group, type of work, quantity lines, heating system checkboxes.
- **Pre-filled details** from the profile, subcontractor directory and job: block/lot/qualifier, work site, owner, contractor, license number and expiry, HIC registration, FEIN, phone, email. The test profile gets fictional addresses, phones and emails added to make this possible.
- **Description of work** on each technical section: a short list of that trade's work items, ending "See attached scope of work." If it doesn't fit the box even at a smaller font size, the box just says "See attached scope of work."
- **Left blank:** every fee and "office use only" box (CQ-10), signature lines, and sizes the contractor didn't give (CQ-08; the cover checklist tells the sub to fill them in).

## Tests (written before the builder)

1. **Field read-back** for all nine MW/FULL jobs: build the packet, read every field back out of the PDF, and compare with the expected entries in `tests/packets/`. Those expected entries are copied from the approved "Expected form entries" tables in the test doc, not from the engine's output, so a mapping mistake can't hide behind an engine result.
2. **Nothing extra:** every field not in a form's map stays empty. This guards the fee boxes and catches a value landing in the wrong box.
3. **Right forms, right order:** each packet contains exactly the forms the engine selected, in print order, with the right page count.
4. **Our pages say the right things:** the text read back from each cover checklist includes its signers, fill-ins and steps (e.g. J-08's two minor-work steps come first). Same for the no-permit sheets for J-02 and J-06.
5. **Warnings, not blocks:** J-08 as written (expired Northside license) builds a full packet with the LC-03 warning at the top of the cover checklist. J-08 with Clearair builds the same packet without the warning.
6. **Forms haven't changed:** each file in `assets/forms/` still matches the fingerprint in `forms.yaml`. If DCA revises a form and someone swaps the file, this fails until the field map is rechecked.
7. **Determinism:** building the same job twice gives the identical PDF.

## Decisions in this plan (my recommendations)

1. **The applicant's agent fields on F100 are pre-filled with the contractor, and the "Agent-Contractor" box is checked.** N.J.A.C. 5:23-2.15(d) lets an agent or contractor apply, accompanied by an affidavit "of the owner or the authorized person making the application." F100's signed Agent Section is that statement. The owner authorization page stays in the packet (owner decision 2026-10-23). State law doesn't require it, but it backs up what the contractor certifies with the owner's own signature.
2. **Warn, don't block (owner decision 2026-10-23).** An expired subcontractor license (LC-03) no longer stops printing. The packet prints, and the warning appears at the top of the cover checklist and wherever the app shows the flags. It says plainly that the office will likely reject the section and that the sub may not legally do or sign for the work until the license is renewed. This changes an approved rule (LC-03) and an approved expected answer (J-08), so both get recorded under "Changes after approval". Jobs the app can't handle at all still get no packet, because there's no correct packet to print: out of scope, an item that matches no rule, or a homeowner doing their own trade work (LC-05). Each one gets an explanation instead.
3. **The scope of work in M2 is a plain list**, not prose: each work item grouped by trade, with that trade's cost. M3 adds the AI-written narrative above it. The list stays as a fallback. The separate scope page comes from the product brief. It isn't required by state law, which only requires a description of the work on the application itself (5:23-2.15(a)); the forms' description boxes cover that.
4. **Copies go on the cover checklist only (owner decision 2026-10-23).** The packet always holds one set; the contractor prints extra copies from the print dialog. Two checklist lines are added to the rule data:
   - "Submit one original plus three copies (DCA forms page; confirm with Maplewood)". This is new assumption A-22.
   - When plans are flagged: "Bring at least two copies of the plans" (state requirement, 5:23-2.15(f)1).
5. **Print every page of each official form as DCA provides it (owner decision 2026-10-23)**, including F100's instruction pages, rather than picking pages.

## Not in M2: homeowner doing their own trade work

The owner wants this handled (2026-10-23) instead of stopping at LC-05. The official forms support it: F120, F130 and F145 have an "Exempt Applicant" box, and F100 has owner-occupant certifications. But it needs new rules, so it follows the usual order: research the state guidance, add rules and test jobs for owner review, then build. That comes as its own step after M2. In M2, the field maps include the exempt and owner-occupant boxes, so no form has to be re-mapped later.

## What you'll review at the end

- **Printed packets for J-01, J-04 and J-08** (with the expired-license warning) from `npm run packet`. Check that each box holds what the test doc says, and that the cover checklist would get a packet out the door with nothing missed.
- The J-02 "no permit needed" sheet.
- The test report.
- Optional: the proof sheets, if you want to spot-check a field map yourself.

## How it's done

On a branch, `m2-packet-builder`. First the forms, proof sheets and field maps, then the tests (all failing), then the builder and pages until they pass, then the demo command. After your review, merge to `main`.

**If a test job's expected form entry turns out to be wrong or has no matching box** on the official form, I won't change the expected answer myself. I'll stop and bring it to you, as in M1.

## Build notes (2026-10-23)

**Status.** Built on `m2-packet-builder`. All 218 tests pass, including field read-back for all nine MW/FULL jobs. Waiting for owner review.

**Decided by the owner (2026-10-23)** (no approved answer was changed):

1. **"Other" lines on F120 and F145 have no box for their description.** The official forms print just "OTHER" (F120) and "Other" (F145) next to the count, with no write-in line (F130 has one). This affects the approved entries for J-03 (F120), and J-04, J-08, J-09 and J-10 (F145). The count goes on the Other row as expected. The description goes in that form's "Description of work" box, marked, for example "A/C condensing unit, 3-ton (on the Other line)". **Owner: keep this.**
2. **F370 has no use-group box.** The engine gives F370 a use group (R-5), but the form doesn't ask for one, so it isn't printed. The test doc's tables don't list F370 entries, so nothing approved is affected. **Owner: leave it.**

**Interpretations made while building** (flag any you disagree with):

1. **F100 §VII.** R-5 goes in "Use Group, Proposed". "Change in Use Group, Indicate Present" stays blank, because the use doesn't change. Technical sections get R-5 as both present and proposed (CQ-06).
2. **F120 "KW [ ] Dishwasher [ ] Garbage Disposal".** The engine reports these as one line ("KW Dishwasher/Disposal"), so both boxes are checked whenever it appears. Right for J-01 (both are installed). If a job ever has only one, the rule data should split the line.
3. **"Licensed Contractor" is checked** on F120, F130 and F145 when a licensed sub signs (A-2). "Exempt Applicant" and the F100 Owner Section boxes are mapped but never filled until the homeowner path is built.
4. **Boilers on F145.** The form has separate Steam Boiler and Hot Water Boiler rows; the engine has one Boiler line. A boiler goes on Other, labelled "Boiler", for the sub to correct. No test job has a boiler.
5. **Ownership in Fee:** "Private" is marked (v1 is one- and two-family homes only).
6. **Left blank** for the person signing: print-name lines, F370's verifying individual and everything below its header (the HVACR contractor completes the chimney details), architect, responsible person, §VI building characteristics, fax numbers, and a sub's HIC and FEIN (not in the directory).
7. **Text that doesn't fit shrinks** (to 6 pt at the smallest). F100's FEIN box takes 9 characters, so the FEIN is written without the dash there. Unused F100 dropdowns print "Select Group", exactly as on the blank form.
8. **The F100 signer** on the cover is the contractor, in the Agent Section (decision 1); the owner signs our authorization page.
9. **Demo packets use the test date** (2026-10-22), like the engine tests, so license checks and the "Prepared" line don't change from day to day.

**Found while checking proof sheets.** Some DCA boxes set their own font size, which overrode ours, so long entries were cut off. The filler now sets the size on each box too. This is the kind of mistake the proof sheets are for.

**Review material:** `npm run packet -- J-01`, `J-04`, `J-08` (and `J-08 --hvacr clearair`), `J-02`; [m2-test-report.txt](../reports/m2-test-report.txt); optional proof sheets via `npm run form-proof -- F120` next to `assets/forms/F120.map.yaml`.
