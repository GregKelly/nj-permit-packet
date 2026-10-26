# v1 Test Jobs: DRAFT for owner review

*Draft, October 2026. Ten realistic Maplewood jobs with the answer a knowledgeable permit expediter would give, per the approved rules table (`docs/rules-table-v1.md`). These become the automated test suite: same input → same output.*

**What each job tests.** The contractor's description is the input. Every job has two layers of testing:
1. **Fact extraction (AI).** Did Claude pull out the right facts, mark the right things `unknown`, and ask only the follow-up questions listed? Checked on the key facts, since wording varies.
2. **Determinations (rules engine).** Given the confirmed facts, did the engine produce exactly the expected tier, forms, signers, zoning, plans, tips, flags and form entries? Checked exactly, because this part has to be deterministic.

**Fixed test conditions**
- "Today" is **2026-10-22** for every test, so license-expiry checks don't change over time.
- Addresses use real Maplewood street names with made-up house numbers. The parcel lookup is tested separately; these tests supply the property facts directly.
- People, companies and license numbers are fictional.
- No fees are calculated (owner decision 2026-10-22). Each job instead lists what gets written on the forms: work type, estimated cost by subcode, and quantity lines, per §4.4 of the rules table (CQ-01 to CQ-10).

**Changes after approval** (owner decisions 2026-10-22, found while encoding the tests in M1; the automated fixtures in `tests/jobs/` carry the same changes)
1. **J-04:** tips are TP-03 **and TP-05**. The house was built in 1956, so the lead-safe tip applies, as in the other pre-1978 jobs.
2. **J-05 / J-05b:** also ask "Is the furnace or water heater in or next to the finished rooms?" (answer: No), consistent with J-04.
3. **J-05b:** the F120 Devices count becomes **6** (CQ-07 counts every device installed). "Form entries unchanged" referred to tier, forms and costs.
4. **J-10:** ask "Is the new hood more powerful than the old one?" (answer: Yes). KB-15 keeps its approved "or no higher than existing" branch, so the old hood's rating matters.

**Changes after approval, M2** (owner decisions 2026-10-23, in the approved [M2 plan](plans/m2-plan.md); `tests/jobs/` carries the same changes)
5. **J-08 / LC-03:** an expired subcontractor license **warns instead of blocking printing**. J-08 as written builds the full packet, with the LC-03 warning at the top of the cover checklist: the office will likely reject the section, and the sub may not legally do or sign for the work until the license is renewed. Re-running with Clearair still clears the flag and changes nothing else.
6. **Copies (new rules SB-01, SB-02 and assumption A-22):** the cover checklist of every packet says "Submit one original plus three copies of each completed form"; when plans are flagged it adds "Bring at least two copies of the plans" (N.J.A.C. 5:23-2.15(f)1). The packet itself holds one set.

**Changes after approval, homeowner build** (owner decision 2026-10-26; `tests/packets/` carries the change)
7. **J-11, J-12a, J-13b (F120 HIC box):** the approved entry "Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii" is too long for the box (106 pt of text at the smallest type in a 58 pt box), so F120 prints **"Exempt: owner"**. F130 and F145 have wider boxes and print "Exempt: owner, 5:23-2.15(b)8.ii" (unit case J-12b). The engine's entry keeps the full text.

---

## Shared test profile

**Contractor (applicant):** Hollis Building Co. LLC · HIC reg. 13VH00000001 · FEIN 00-0000001

**Subcontractor directory**

| Trade | Company | License | Expires |
|---|---|---|---|
| Electrical | Watts Electric LLC | 34EB00000101 | 2027-06-30 |
| Plumbing | Sutton Plumbing & Heating | 36BI00000202 | 2027-03-31 |
| HVACR | Clearair Mechanical | 19HC00000303 | 2027-08-31 |
| HVACR | Northside Heating & Cooling | 19HC00000404 | **2026-09-30 (expired)** |

Building-section work (F110) is done by Hollis, which signs F110 as applicant. F100 is signed by the owner, or by Hollis as agent with the owner authorization page.

---

## Coverage

| Job | Type | Outcome | What makes it tricky |
|---|---|---|---|
| J-01 | Kitchen | FULL | Many items at mixed tiers; wall removal stated non-bearing |
| J-02 | Bath | **No permit** | Looks like a remodel; every item is ordinary maintenance |
| J-03 | Bath | FULL + zoning | Vague description; four follow-up questions; enlarged window |
| J-04 | Basement | FULL | Five sections; ejector pump; foam insulation; duct extension |
| J-05 | Basement | FULL + zoning | Bedroom + new egress window; exactly 5 outlets (boundary) |
| J-06 | Roof | **No permit** | Detached house; decking replaced; zoning "confirm" note |
| J-07 | Roof | FULL + zoning | Attached twin (not detached) + skylights |
| J-08 | HVAC | Minor work | Like-for-like swap; F370; **expired sub license** warns (blocked printing until change 5) |
| J-09 | HVAC | FULL + zoning | New mini-split; new outdoor unit; load calc flag only |
| J-10 | Kitchen | FULL | Sounds cosmetic; gas upsizing + 900 cfm hood; OM costs excluded |
| J-11 | Kitchen | FULL, owner applicant | Owner does all the electrical; F100 Owner Section; F120 exempt |
| J-12 | Basement | **Blocked** (HO-02) | Two-family: owner may do electrical but not plumbing (A-26); two variants |
| J-13 | Kitchen + HVAC | **Blocked** (HO-04) | Twin: owner may swap the furnace but not the A/C; split signer (HO-05); mixed packet |

**Not covered by these ten** (add later or test as unit tests): out-of-scope property (3+ units or commercial), missing HIC registration (LC-01), the owner doing building work (LC-05, narrowed 2026-10-26), lead abatement (KB-24), bearing wall removal (KB-21), oil-to-gas conversion (HV-02), unknown answered "don't know" (conservative branch).

---

## J-01 · Kitchen gut with wall removal

**Why it's here:** the typical big kitchen. Mixes OM, MW and FULL items, so tests that the job takes the highest tier and that OM items still show up in the explanation.

**Property:** 34 Oakview Ave · detached single-family · class 2 · built 1925

**Description (input):**
> Full kitchen gut at 34 Oakview Ave for the Morenos. Taking down the wall between the kitchen and dining room. It's not load bearing, I checked from the basement, joists run parallel to it. New cabinets, quartz counters, LVP floor, new drywall throughout. Moving the sink to the new island and adding a dishwasher and disposal there. Electrical: two new 20A counter circuits, 8 recessed cans, island outlets, about 18 devices total. Range stays where it is, same gas hookup. Contract is $48,000: plumbing about $3,500, electrical about $5,500.

**Follow-up questions expected:** none. Every fact the rules need is stated.

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Cabinets, counters | KB-01 | OM |
| LVP flooring | KB-02 | OM |
| New drywall throughout (≥ 25%) | KB-05 | MW |
| Non-bearing wall removed | KB-20 | MW |
| Sink relocated to island (+ dishwasher on new run) | KB-08 | FULL |
| New circuits, 18 devices | KB-13 | FULL |
| Range unchanged | KB-14 | OM |

**Expected packet**
- **Tier:** FULL (permit before work starts)
- **Forms & signers:** F100 (owner / Hollis as agent) · F110 (Hollis) · F120 (Watts Electric) · F130 (Sutton Plumbing)
- **Zoning:** not required (ZN-01, interior only)
- **Plans:** floor plan required, unsealed sketch acceptable (PL-02, ⚠️ A-7)
- **Tips:** TP-05 (built 1925, lead-safe practices)
- **Flags:** none

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Alteration |
| F100 §IIb | Building / Electrical / Plumbing / Total | $39,000 / $5,500 / $3,500 / **$48,000** |
| F100 §VII, all sections | Use group | R-5 |
| F110 | Type of work · Rehabilitation cost · Total | Rehabilitation · $39,000 · $39,000 |
| F120 | Est. cost · Devices · KW Dishwasher/Disposal | $5,500 · 18 · 2 (size blank) |
| F130 | Est. cost · Sink · Dishwasher | $3,500 · 1 · 1 |

**Cover checklist extra:** "Watts Electric: fill in kW sizes for dishwasher and disposal" (CQ-08).

---

## J-02 · Hall bath refresh (no permit)

**Why it's here:** a "you may not need a permit" case. A contractor would usually file for this; the right answer is that nothing on the list needs one.

**Property:** 18 Elmwood Ave · detached single-family · class 2 · built 1987

**Description (input):**
> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

**Follow-up questions expected:** none.

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Vanity | KB-01 | OM |
| Toilet, same spot, same piping | KB-06 | OM |
| Tile floor | KB-02 | OM |
| Faucet, shower valve | KB-06 (2.7(c)2.vi–vii) | OM |
| Light fixture like-for-like | KB-10 | OM |
| Exhaust fan, vents outside | KB-17 | OM |
| Paint | KB-03 | OM |

**Expected output**
- **Tier:** no permit needed. Print the one-page explanation listing each item with its citation, not a packet.
- **Zoning:** not required (ZN-01)
- **Tips / flags:** none (built after 1978)
- **Forms:** none

---

## J-03 · Primary bath with vague details

**Why it's here:** tests the follow-up loop. The description leaves four facts unclear that each change the outcome, and the AI must ask rather than guess.

**Property:** 7 Tuscan Rd · detached single-family · class 2 · built 1938

**Description (input):**
> Redo the primary bath at 7 Tuscan Rd. Rip out the tub, put in a walk-in tile shower. Double vanity instead of the single. Heated floor. Owner wants a bigger window over the tub area. Budget $32k.

**Follow-up questions expected** (wording may vary) **and test answers**

| # | Question | Answer | Leads to |
|---|---|---|---|
| 1 | Is the shower drain staying where the tub drain is? | No, moves about 3 ft | KB-08 |
| 2 | Will the second sink need a bigger drain or water line? | No, ties into the existing drain | KB-07 |
| 3 | Is the heated floor on a new circuit? | Yes, new 20A GFCI circuit; mat under 1 kW | KB-13 |
| 4 | How much bigger is the window: does the opening change? | Yes, 30" → 48" wide | KB-23 |
| 5 | Cost split by trade? | Plumbing $6,000, electrical $2,000 | F100 §IIb, CQ-02 |

The AI must **not** assume the drain moves or the window opening changes before asking.

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Shower replaces tub, drain relocated | KB-08 | FULL |
| Second lavatory, no upsizing | KB-07 | MW |
| Heated floor on new circuit | KB-13 | FULL |
| Window opening enlarged | KB-23 | FULL |
| Vanity, tile, finishes | KB-01/02/03 | OM |

**Expected packet**
- **Tier:** FULL
- **Forms & signers:** F100 · F110 (Hollis) · F120 (Watts) · F130 (Sutton)
- **Zoning:** **required** (ZN-02, enlarged opening). Checklist: zoning application, survey showing the work, impervious coverage calc, $50, approval before submitting.
- **Plans:** **sealed** (PL-01, header for enlarged opening)
- **Tips:** TP-05 (built 1938)
- **Flags:** none

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Alteration |
| F100 §IIb | Building / Electrical / Plumbing / Total | $24,000 / $2,000 / $6,000 / **$32,000** |
| F110 | Type of work · Rehabilitation cost | Rehabilitation · $24,000 |
| F120 | Est. cost · Other | $2,000 · "Radiant floor heat mat on new 20A GFCI circuit": 1 |
| F130 | Est. cost · Shower · Lavatory | $6,000 · 1 · 2 |

---

## J-04 · Full basement finish with bathroom

**Why it's here:** the biggest form set (five sections), and several items that each change the tier on their own: ejector pump, foam insulation, more than 5 outlets, duct extension.

**Property:** 52 Durand Rd · detached single-family · class 2 · built 1956

**Description (input):**
> Finish the basement at 52 Durand Rd: family room, home office, full bath. Framing, drywall, drop ceiling. Bath gets a toilet, sink and shower. Toilet needs an ejector pit since the main drain is above the slab. About 14 recessed lights and 12 outlets on new 20A circuits, plus 2 hardwired smoke/CO combos tied into the existing ones upstairs. Extend 3 supply runs off the existing trunk. Spray foam the rim joists. Ceiling is 7'2" to the joists. $68k total: plumbing $9k, electrical $7k, HVAC $1.5k.

**Follow-up questions expected and test answers**

| # | Question | Answer | Leads to |
|---|---|---|---|
| 1 | Will any finished room be used as a bedroom? | No | Not FB-04 |
| 2 | Is the furnace or water heater in or next to the finished rooms? | No, separate unfinished utility room | Not TP-04 |

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Partitions, drywall, ceiling | FB-01 | MW |
| Spray foam (foam plastic, not OM) | FB-02 | MW (on F110) |
| Habitable space | FB-03 | MW |
| Bathroom with ejector pump | FB-06 (⚠️ A-8) | FULL |
| 26 lights/outlets, new circuits | FB-07 → KB-13 | FULL |
| Hardwired smoke/CO alarms | FB-08 | MW |
| Duct extension | FB-09 (⚠️ A-9) | MW |

**Expected packet**
- **Tier:** FULL
- **Forms & signers:** F100 · F110 (Hollis) · F120 (Watts) · F130 (Sutton) · F145 (Clearair)
- **Zoning:** not required (ZN-01)
- **Plans:** floor plan, unsealed acceptable (PL-02, ⚠️ A-7)
- **Tips:** TP-03 (ceiling height), TP-05 (built 1956) *(TP-05 added 2026-10-22)*
- **Flags:** none. Q-8 (interconnected alarms) shown as an open question.

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Alteration |
| F100 §IIb | Building / Electrical / Plumbing (incl. mechanical, A-20) / Total | $50,500 / $7,000 / $10,500 / **$68,000** |
| F110 | Type of work · Rehabilitation cost | Rehabilitation · $50,500 |
| F120 | Est. cost · Devices · Detectors | $7,000 · 26 · 2, marked Smoke (A-18) |
| F130 | Est. cost · Water closet · Lavatory · Shower · Sewer pump | $9,000 · 1 · 1 · 1 · 1 |
| F145 | Est. cost · Heating system · Other | $1,500 · Modification to existing, Hot Air, fuel blank · "Supply duct extension, 3 runs": 1 |

**Cover checklist extra:** "Clearair Mechanical: fill in fuel type on F145" (fuel not stated, CQ-08).

---

## J-05 · Basement guest bedroom with new egress window

**Why it's here:** a bedroom triggers egress; cutting a new egress window makes it structural, sealed and a zoning job. Also a **boundary test**: exactly 5 outlets on an existing circuit stays minor work.

**Property:** 9 Highland Pl · detached single-family · class 2 · built 1948

**Description (input):**
> Turning the back half of the basement at 9 Highland Pl into a guest bedroom. Frame two walls, drywall, carpet. 3 outlets and 2 ceiling lights off the existing basement circuit, which has plenty of room. Cutting a new egress window with a window well on the side of the house since there's no window big enough now. $26k, electrical about $1,200.

**Follow-up questions expected and test answers**

| # | Question | Answer | Leads to |
|---|---|---|---|
| 1 | Smoke and CO alarms in the new bedroom: hardwired or battery? | Battery | FB-08 → OM |
| 2 | Is the furnace or water heater in or next to the finished rooms? *(added 2026-10-22)* | No | Not TP-04 |

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Partitions, drywall | FB-01 | MW |
| Carpet | KB-02 | OM |
| Bedroom created | FB-04 | FULL |
| New egress window + areaway (foundation cut) | FB-05 | FULL |
| 5 outlets on existing circuit | FB-07 → KB-11 | MW (boundary: 5 is the limit) |
| Battery smoke/CO alarms | FB-08 | OM |

**Expected packet**
- **Tier:** FULL
- **Forms & signers:** F100 · F110 (Hollis) · F120 (Watts)
- **Zoning:** **required** (ZN-02, new opening + egress areaway)
- **Plans:** **sealed** (PL-01, foundation cut)
- **Tips:** TP-03 (ceiling height), TP-05 (built 1948)
- **Flags:** none

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Alteration |
| F100 §IIb | Building / Electrical / Total | $24,800 / $1,200 / **$26,000** |
| F110 | Type of work · Rehabilitation cost | Rehabilitation · $24,800 |
| F120 | Est. cost · Devices | $1,200 · 5 (battery alarms aren't listed: OM) |

**Variant J-05b (boundary):** same job with **4 outlets + 2 lights (6)**. KB-11 no longer applies, so electrical becomes FULL (KB-13). The job tier, forms and costs are unchanged; the electrical item's tier and reason change, and the F120 Devices count becomes 6 *(clarified 2026-10-22)*.

---

## J-06 · Roof replacement, detached house (no permit)

**Why it's here:** the most common "you don't need a permit" surprise. Also tests that decking replacement stays within ordinary maintenance and that the zoning note appears.

**Property:** 41 Wyoming Ave · detached single-family · class 2 · built 1912

**Description (input):**
> Tear off and replace the roof at 41 Wyoming Ave, single family. Architectural shingles, new ice and water shield, replace a few sheets of rotted plywood. New gutters and leaders. $18,500.

**Follow-up questions expected and test answers**

| # | Question | Answer | Leads to |
|---|---|---|---|
| 1 | Any rafter or structural repairs, skylights, or roofline changes? | No | Not RF-04/05/06 |
| 2 | How many layers of roofing are on there now? | One | Not TP-01 |

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Roof covering, detached house | RF-01 | OM |
| Some decking replaced | RF-03 (⚠️ A-11) | OM |
| Gutters and leaders | RF-07 | OM |

**Expected output**
- **Tier:** no permit needed (one-page explanation)
- **Zoning:** ZN-03 note: "Zoning permit probably not required for like-for-like replacement. Confirm with Maplewood Zoning, 973-762-8120 ext. 5602."
- **Tips:** TP-05 (built 1912)
- **Forms:** none

---

## J-07 · Reroof on an attached twin, with skylights

**Why it's here:** same kind of job as J-06, but the house shares a wall with the neighbor, so the detached-house exemption doesn't apply. The skylights add structure and zoning.

**Property:** 103 Boyden Ave · attached single-family (twin) · class 2 · built 1928

**Description (input):**
> Reroof the left half of the twin at 103 Boyden Ave (shares a wall with the neighbor). Owner also wants two skylights in the back slope. $22k.

**Follow-up questions expected:** layers of roofing → "one" (no TP-01). Detached vs attached is stated.

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Roof covering, attached dwelling | RF-02 (⚠️ A-10) | MW |
| Two new skylights | RF-05 | FULL |

**Expected packet**
- **Tier:** FULL
- **Forms & signers:** F100 · F110 (Hollis)
- **Zoning:** **required** (ZN-02, new openings: skylights)
- **Plans:** **sealed** (PL-01, framing at skylights)
- **Tips:** TP-05 (built 1928)
- **Flags:** none

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Alteration (new skylight openings) |
| F100 §IIb | Building / Total | $22,000 / **$22,000** |
| F110 | Type of work · Rehabilitation cost | Rehabilitation + Roofing · $22,000 |

---

## J-08 · Furnace and A/C swap, expired HVAC license

**Why it's here:** the minor-work path (notice before starting, application within 5 business days), the F370 chimney form, and the **missing/expired registration** flag.

**Property:** 66 Parker Ave · detached single-family · class 2 · built 1994

**Description (input):**
> Swap out the 20-year-old gas furnace and AC condenser at 66 Parker Ave for same-size units: 80k BTU furnace, 3-ton AC. Condenser goes back on the same pad. New thermostat. Northside is doing it. $14,500.

**Follow-up questions expected and test answers**

| # | Question | Answer | Leads to |
|---|---|---|---|
| 1 | How much of the $14,500 is electrical work? | About $500 | F100 §IIb, F120 cost |

Like capacity, same location and fuel are all stated, so nothing else is asked.

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Furnace, like capacity, same fuel | HV-01 | MW |
| A/C condenser, like capacity, same pad | HV-01 / HV-11 | MW |
| Thermostat | HV-06 | OM |

**Expected packet**
- **Tier:** MINOR WORK. Checklist puts **"Notify the construction office before work starts"** first and **"File this packet within 5 business days of the notice"** second.
- **Forms & signers:** F100 · F145 (Northside) · F120 (Watts, ⚠️ A-2, Q-3 open) · **F370** chimney verification (fuel-fired replacement)
- **Zoning:** ZN-03 "probably not required, confirm" note (same-pad condenser)
- **Plans:** none (PL-04)
- **Tips:** none
- **Flags:** **LC-03: Northside Heating & Cooling's HVACR license expired 2026-09-30.** ~~Printing is blocked until the contractor updates the license or picks another sub.~~ *Changed 2026-10-23 (change 5): the packet prints with the warning at the top of the cover checklist.* Re-running with Clearair clears the flag and changes nothing else.

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Minor Work |
| F100 §IIb | Electrical / Plumbing (mechanical, A-20) / Total | $500 / $14,000 / **$14,500** |
| F145 | Est. cost · Heating system · Hot Air Furnace · Other | $14,000 · Replacement, Hot Air, Gas · 1 · "A/C condensing unit, 3-ton": 1 |
| F120 | Est. cost · KW Central AC Unit · HP/KW Furnace | $500 · 1 (size blank) · 1 (size blank) |

**Cover checklist extra:** "Watts Electric: fill in sizes for A/C unit and furnace" (CQ-08).

---

## J-09 · New ductless mini-split

**Why it's here:** new equipment, not a replacement, so it's a full permit. A new outdoor unit triggers zoning. The load-calc flag must not turn into a plans requirement.

**Property:** 15 Midland Blvd · detached single-family · class 2 · built 1931

**Description (input):**
> Install a 3-zone ductless mini-split at 15 Midland Blvd, cooling only. House has steam radiators, owner is keeping those for heat. Outdoor unit on a new pad in the side yard, line sets run up the outside wall. New 30A circuit for the condenser. Clearair is installing. $16k.

**Follow-up questions expected and test answers**

| # | Question | Answer | Leads to |
|---|---|---|---|
| 1 | How much of the $16,000 is electrical work? | About $900 | F100 §IIb, F120 cost |

(The line-set holes don't cut framing, per the HV-03 wording, so that isn't asked.)

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| New A/C system where none existed | HV-03 | FULL |
| New outdoor unit in side yard | HV-03 → ZN-02 | (zoning) |

**Expected packet**
- **Tier:** FULL
- **Forms & signers:** F100 · F145 (Clearair) · F120 (Watts)
- **Zoning:** **required** (ZN-02, new outdoor equipment; setbacks)
- **Plans:** none required; PL-03 flag "equipment location and load calculation may be requested" (Q-10)
- **Tips:** TP-05 (built 1931)
- **Flags:** none

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Alteration (new equipment) |
| F100 §IIb | Electrical / Plumbing (mechanical, A-20) / Total | $900 / $15,100 / **$16,000** |
| F145 | Est. cost · Heating system · Other | $15,100 · blank (cooling only) · "Ductless mini-split, 1 outdoor + 3 indoor units": 1 |
| F120 | Est. cost · KW Mini Split | $900 · 1 (size blank) |

**Cover checklist extra:** "Watts Electric: fill in mini-split size" (CQ-08).

---

## J-10 · "Cosmetic" kitchen with a pro range

**Why it's here:** reads like a refresh, but the range swap upsizes the gas line and the hood is over 400 cfm. Also tests that OM work (cabinets, counters) adds no F110 and is left out of the permit's cost (⚠️ A-16).

**Property:** 27 Prospect St · detached single-family · class 2 · built 1979

**Description (input):**
> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

**Follow-up questions expected:** "Is the new hood more powerful than the old one?" → Yes, so not KB-15 *(added 2026-10-22)*. (The hood duct penetration isn't an "opening" for zoning, per the ZN-02 wording.)

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Paint cabinets, counters, backsplash | KB-01 / KB-03 | OM |
| Range swap needing a bigger gas line (not KB-14: pipe size changes) | KB-19 (⚠️ A-6) | FULL |
| New 900 cfm hood vented outside | KB-16 (⚠️ A-4) | FULL |

**Expected packet**
- **Tier:** FULL
- **Forms & signers:** F100 · F130 (Sutton, gas piping) · F120 (Watts) · F145 (Clearair, hood). **No F110.**
- **Zoning:** not required (no ZN-02 change)
- **Plans:** none (PL-04)
- **Tips:** TP-02 (make-up air over 400 cfm). No TP-05 (built 1979).
- **Flags:** none

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Alteration (gas system extended, new equipment) |
| F100 §IIb | Electrical / Plumbing (gas + mechanical, A-20) / Total | $600 / $3,000 / **$3,600**. No Building box (CQ-03) |
| F130 | Est. cost · Gas piping | $1,200 · 1 |
| F120 | Est. cost · Devices | $600 · 1 |
| F145 | Est. cost · Heating system · Other | $1,800 · blank · "Range hood, 900 cfm, ducted outside": 1 |

---

# Homeowner trade-work jobs: approved by owner (2026-10-26)

*From the approved [homeowner trade-work plan](plans/homeowner-trade-plan.md), rules in [rules table §4.7](rules-table-v1.md#47-homeowner-does-their-own-trade-work-approved-2026-10-26). Same fixed test conditions and shared profile as above. **Blocked** means printing is blocked with the flag's explanation. The determinations are still shown so the contractor can see the rest of the job.*

## J-11 · Kitchen, owner does the electrical

**Why it's here:** the main case that works. Same work as J-01, but the owner does all the electrical. Tests the F100 Owner Section, the F120 exempt entries, dropping the owner authorization page, and the new "does the owner live there" question.

**Property:** 19 Ridgewood Rd · detached single-family · class 2 · built 1952

**Description (input):**
> Kitchen at 19 Ridgewood Rd. Taking out the wall between kitchen and dining, not load bearing (joists run parallel, checked from the basement). New cabinets, quartz, LVP, new drywall throughout. Sink moves to the new island with a dishwasher and disposal. Owner is doing all the electrical himself: two new 20A counter circuits, 8 cans, island outlets, about 18 devices. He figures $2,000 for it. Our contract is $42,500, plumbing about $3,500.

**Follow-up questions expected and test answers**

| # | Question | Answer | Leads to |
|---|---|---|---|
| 1 | Does the owner live in the home? | Yes | HO-01 passes |

**Confirmed facts → determinations:** items, rules and tiers exactly as J-01. Electrical by the owner passes HO-01 and HO-06.

**Expected packet**
- **Tier:** FULL
- **Forms & signers:** F100 (**owner, Owner Section**) · F110 (Hollis) · F120 (**owner, Exempt Applicant**) · F130 (Sutton Plumbing). **No owner authorization page** (HO-F2). Watts Electric isn't used.
- **Zoning:** not required (ZN-01)
- **Plans:** floor plan required, unsealed sketch acceptable (PL-02, ⚠️ A-7)
- **Tips:** TP-05 (built 1952)
- **Flags:** none (no LC-02 for electrical)

**Expected form entries** (fee boxes left blank, CQ-10)

| Form | Field | Entry |
|---|---|---|
| F100 §IIa | Proposed work | Alteration |
| F100 §IIb | Building / Electrical / Plumbing / Total | $39,000 / $2,000 / $3,500 / **$44,500** |
| F100 page 1 | Principal Contractor | Hollis Building Co. LLC |
| F100 page 2 | Owner Section | C ✓ · C.3 Electrical ✓ · D ✓ · A, B, C.1, C.2, C.4 blank · Agent Section blank |
| F110 | Type of work · Rehabilitation cost · Total | Rehabilitation · $39,000 · $39,000 |
| F120 | Licensed / Exempt | Exempt Applicant ✓ |
| F120 | Contractor block | Owner's name, address, phone, email · License: "Exempt: homeowner, N.J.S.A. 45:5A-18(n)" · Exp. blank · HIC: "Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii" · FEIN blank |
| F120 | Est. cost · Devices · KW Dishwasher/Disposal | $2,000 · 18 · 2 (size blank) |
| F130 | Est. cost · Sink · Dishwasher | $3,500 · 1 · 1 |

**Cover checklist extras:** "Owner: fill in kW sizes for dishwasher and disposal" (HO-F6). HO-T1 for electrical. HO-T2: "The estimated cost for your electrical work is the figure given ($2,000)…"

---

## J-12 · Two-family basement, owner wants to do electrical and plumbing

**Why it's here:** the home-type rules split by trade. In a two-family, the owner may do the electrical (A-23) but not the plumbing (HO-02, A-26). Also tests that the A-26 switch works.

**Property:** 88 Prospect St · detached two-family · class 2 · built 1921

**Description (input):**
> Basement finish at 88 Prospect St, it's a two-family and the owner lives on the first floor. Rec room plus a half bath (toilet and sink, gravity drain, no pump). We're doing framing, drywall and drop ceiling, $28k. Owner wants to do the electrical and plumbing herself to save money: about 10 outlets and 6 lights on a new circuit, and the half bath rough-in.

**Follow-up questions expected and test answers**

| # | Question | Answer | Leads to |
|---|---|---|---|
| 1 | Will any finished room be used as a bedroom? | No | Not FB-04 |
| 2 | Is the furnace or water heater in or next to the finished rooms? | No | Not TP-04 |
| 3 | Will the new fixtures need a bigger drain or water line? | No | FB-06 stays MW |
| 4 | What's the estimated cost of the owner's electrical work? | About $1,500 | F100 §IIb, F120 cost |
| 5 | What's the estimated cost of the owner's plumbing work? | About $1,200 | F100 §IIb, F130 cost |

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Partitions, drywall, ceiling | FB-01 | MW |
| Habitable space (rec room) | FB-03 | MW |
| Half bath, no upsizing | FB-06 | MW |
| 16 lights/outlets, new circuit | FB-07 → KB-13 | FULL |

Electrical by the owner passes HO-01 and HO-06 (two-family allowed, ⚠️ A-23). Plumbing by the owner **fails HO-02** (two-family, ⚠️ A-26).

**Expected result (as written)**
- **Tier:** FULL
- **Forms & signers:** F100 (owner) · F110 (Hollis) · F120 (owner, exempt) · F130 (**no eligible signer**)
- **Zoning:** not required (ZN-01) · **Plans:** floor plan, unsealed acceptable (PL-02) · **Tips:** TP-03, TP-05
- **Flags:** **HO-02: "NJ plumbing law lets only a single-family homeowner do their own plumbing. Assign a licensed master plumber."** Printing blocked.

**Variant J-12a: Sutton does the plumbing** (quoted at $4,000) and the owner keeps the electrical. The flag clears and the packet prints:

| Form | Field | Entry |
|---|---|---|
| — | Forms & signers | F100 (owner, Owner Section) · F110 (Hollis) · F120 (owner, exempt) · F130 (Sutton). No owner authorization page |
| F100 §IIa | Proposed work | Alteration |
| F100 §IIb | Building / Electrical / Plumbing / Total | $28,000 / $1,500 / $4,000 / **$33,500** |
| F100 page 2 | Owner Section | C ✓ · C.3 Electrical ✓ · D ✓ · others blank |
| F110 | Type of work · Rehabilitation cost | Rehabilitation · $28,000 |
| F120 | Exempt Applicant · Est. cost · Devices | ✓ (contractor block as J-11) · $1,500 · 16 |
| F130 | Licensed Contractor · Est. cost · Water closet · Lavatory | ✓ (Sutton) · $4,000 · 1 · 1 |

**Variant J-12b: as written, with `two_family_owner_plumbing_hvacr: true`** (A-26 flipped). HO-02 passes, so there's no flag. F130 becomes owner, exempt ("Exempt: homeowner, N.J.S.A. 45:14C-12.4"), $1,200, with WC 1 and Lav 1. The F100 Owner Section adds C.4 Plumbing ✓. §IIb reads $28,000 / $1,500 / $1,200 / **$30,700**.

---

## J-13 · Twin, owner swaps the furnace and A/C

**Why it's here:** the HVACR rules. An attached home is fine for owner HVACR work (HO-03), but the A/C involves refrigerant (HO-04), and a trade can't be split between two signers (HO-05). Also covers a minor-work job with an owner applicant.

**Property:** 41 Burnet Ave · attached single-family (twin) · class 2 · built 1931

**Description (input):**
> Taking out the non-bearing wall between kitchen and dining room at 41 Burnet Ave (left half of a twin) and redoing the drywall in both rooms, $16k. The owners live there. While we're at it they want to swap the old gas furnace and the AC condenser themselves, same size (80k BTU, 3-ton), condenser back on the same pad, and do the wiring for them too. They figure $6,500 for the equipment and $200 for the wiring.

**Follow-up questions expected:** none. Occupancy, like capacity, location, fuel and the owner's costs are all stated.

**Confirmed facts → determinations**

| Item | Rule | Tier |
|---|---|---|
| Non-bearing wall removed | KB-20 | MW |
| Drywall in both rooms (≥ 25%) | KB-05 | MW |
| Gas furnace, like capacity | HV-01 | MW |
| A/C condenser, like capacity, same pad | HV-11 | MW |

Electrical by the owner passes HO-01 and HO-06. HVACR by the owner passes HO-01 and HO-03 (attached is allowed), but **fails HO-04** on the condenser.

**Expected result (as written)**
- **Tier:** MINOR WORK (notice-first steps as J-08)
- **Forms & signers:** F100 (owner) · F110 (Hollis) · F120 (owner, exempt) · F145 and F370 (**no eligible signer**)
- **Zoning:** ZN-03 "probably not required, confirm" note (same-pad condenser) · **Plans:** floor plan sketch (PL-02, KB-20) · **Tips:** TP-05
- **Flags:** **HO-04: "Work on the A/C condensing unit involves refrigerant, which the owner can't do under the homeowner exemption. Assign a licensed HVACR contractor for all the HVACR work."** Printing blocked.

**Variant J-13a: Clearair takes the condenser only; the owner keeps the furnace.** HO-04 clears, but **HO-05** blocks: "One person must do and sign for all the HVACR work on this permit. Assign either the owner or Clearair Mechanical to all of it."

**Variant J-13b: Clearair takes the furnace and condenser** (quoted at $9,000); the owner keeps the wiring. No flags; the packet prints:

| Form | Field | Entry |
|---|---|---|
| — | Forms & signers | F100 (owner, Owner Section) · F110 (Hollis) · F120 (owner, exempt) · F145 (Clearair) · F370 (Clearair). No owner authorization page |
| F100 §IIa | Proposed work | Minor Work |
| F100 §IIb | Building / Electrical / Plumbing (mechanical, A-20) / Total | $16,000 / $200 / $9,000 / **$25,200** |
| F100 page 2 | Owner Section | C ✓ · C.3 Electrical ✓ · D ✓ · others blank |
| F110 | Type of work · Rehabilitation cost | Rehabilitation · $16,000 |
| F120 | Exempt Applicant · Est. cost · KW Central AC Unit · HP/KW Furnace | ✓ (contractor block as J-11) · $200 · 1 (size blank) · 1 (size blank) |
| F145 | Est. cost · Heating system · Hot Air Furnace · Other | $9,000 · Replacement, Hot Air, Gas · 1 · "A/C condensing unit, 3-ton": 1 |

**Cover checklist extras (J-13b):** "Owner: fill in sizes for A/C unit and furnace" (HO-F6). HO-T1 and HO-T2 for electrical.

---

## Homeowner unit cases

These are tested in code, without a full write-up:

1. The owner doesn't live there (J-11 with `owner_occupied: no`) → HO-01 blocks electrical.
2. Only an immediate family member lives there → passes for electrical; blocks plumbing and HVACR (HO-01).
3. "Don't know" on occupancy → treated as not living there (conservative branch), so HO-01 blocks.
4. Attached home, owner does plumbing: `own_sewer: yes` → passes; `no` or don't know → HO-02 blocks; the question is asked only in this case.
5. Owner replaces only the furnace on a detached home → passes; F145 and F370 are signed by the owner (⚠️ Q-13); "Exempt: homeowner, N.J.S.A. 45:16A-9"; no C.3/C.4 for HVACR on F100.
6. Owner installs a mini-split (HV-03) → HO-04 blocks.
7. The owner does building work → the narrowed LC-05 still stops.
8. A two-family home where the owner does HVACR → HO-03 blocks; with A-26 flipped it passes.
9. Field read-back for J-11, J-12a and J-13b: F100 Owner Section boxes and every exempt-section entry.

---

## What to check when reviewing

- **Descriptions:** do they sound like how contractors actually write? Too clean or too messy?
- **Expected answers:** any job where your gut says an expediter would answer differently. Those point to a rule to revisit.
- **Mix:** whether the set is missing a job type your contractors file often.
