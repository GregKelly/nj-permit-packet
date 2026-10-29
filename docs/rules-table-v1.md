# v1 Rules Table: DRAFT for owner review

*Draft, October 2026. Scope: one- and two-family dwellings (use group R-3 / R-5) in Maplewood, NJ. Four project types: kitchen & bath, finished basement, roof replacement, HVAC.*

> **Changes after approval** (owner decisions 2026-10-23, M2 plan). The YAML in `rules/` is the source of truth; see [rules-reference.md](rules-reference.md). **LC-03** now warns instead of blocking printing. New **SB-01 / SB-02** (cover-checklist lines for copies of the forms and plans) and assumption **A-22** (one original plus three copies). **CQ-07** (owner decision 2026-10-26, [M3 plan](plans/m3-plan.md) change 4 and 5): an unknown count that goes on a form line is always asked; if the contractor doesn't know, the line is left blank and the cover checklist asks that section's signer to fill in the count. The table below is kept as approved.
>
> **Addendum approved by owner (2026-10-26):** [§4.7 Homeowner does their own trade work](#47-homeowner-does-their-own-trade-work-approved-2026-10-26), new assumptions **A-23 to A-27** and questions **Q-12 to Q-16**. LC-05 is narrowed to building work only.
>
> **Change after approval** (owner decision 2026-10-26, homeowner build): **HO-F3**'s HIC entry "Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii" doesn't fit the HIC box on any form, so each form gets the longest wording that fits: the full text, else "Exempt: owner, 5:23-2.15(b)8.ii" (F130, F145), else "Exempt: owner" (F120). The wordings are in `rules/state/nj/homeowner.yaml`.

> **Change after approval** (owner decision 2026-10-28, M4 review): **Q-3** is reworded to also ask whether F120 is needed at all on a like-for-like A/C or furnace swap, since state rules let the HVACR contractor reconnect a replacement to its existing dedicated disconnect (`docs/research-notes.md`, "HVACR contractors and electrical work"). No determination changes: J-08 still includes F120, signed by the electrician, until the office answers.

This is the human-readable version of the rule data the engine will run. Once you've approved it, each row becomes a record in a rules file (state rules and Maplewood rules kept separate). Rule IDs (e.g. `KB-04`) will carry through to the code and the test suite, so a test failure points back to a row here.

**Legend**
- **OM** = Ordinary maintenance: no permit, no notice (N.J.A.C. 5:23-2.7).
- **MW** = Minor work: the contractor gives the construction office notice before starting, files the permit application within 5 business days, and gets an inspection (N.J.A.C. 5:23-2.17A). Still a full paper packet.
- **FULL** = Permit required before work starts (N.J.A.C. 5:23-2.14).
- ⚠️ **A-n** = rests on an assumption (see [Assumptions](#5-assumptions-register)). These are shown to the user in the app.
- ❓ **Q-n** = open question for you or the construction office (see [Open questions](#6-open-questions)).

Citations are to the UCC text as published by Cornell LII (2.7 amended through 2/16/2021; 2.17A through 4/1/2024). ⚠️ A-1: that text is current. Form contents are from the DCA fillable PDFs, rev. 12/25.

---

## 1. How the engine decides

For each job, the engine runs these steps in order. Each step writes a determination with a reason and a citation.

1. **Scope check.** Is it an R-3/R-5 (one- or two-family) dwelling in Maplewood? If not, stop: *out of scope for v1*.
2. **Break the job into work items.** The AI extracts facts. A kitchen remodel might become "replace cabinets", "move sink 4 ft", and "add 3 outlets". Each work item is classified on its own.
3. **Classify each item** as OM, MW or FULL using the tables below.
4. **Classify the job** by taking the highest tier among its items (FULL > MW > OM). If every item is OM, the result is *no permit needed*, with a printable one-page explanation instead of a packet.
5. **Pick forms.** The F100 jacket, plus each technical section that any item triggers.
6. **Assign signers.** The licensed trade responsible for each section signs it (⚠️ A-2).
7. **Zoning prior approval.** Apply the Maplewood zoning triggers.
8. **Plans.** Flag when drawings are needed and whether they need a seal.
9. **Work type, cost and quantities.** Fill the fields the applicant is responsible for (§4.4). Fees are left to the office.
10. **License and registration checks** against the contractor profile and subcontractor directory.

**Unknown facts.** If a fact that changes the outcome is `unknown`, the engine doesn't guess. It asks the follow-up question listed in §3. If the contractor still doesn't know, the engine takes the more conservative branch and says so.

---

## 2. Rules by project type

Columns: **Condition** (what's true about the work item) → **Tier** → **Forms** → **Plans** → **Notes / citation**. The zoning column is left out here because zoning depends only on interior vs. exterior work (§4.1).

### 2.1 Kitchen & bath (KB)

| ID | Condition | Tier | Forms | Plans | Notes / citation |
|---|---|---|---|---|---|
| KB-01 | Replace or install cabinets, vanities, countertops, bathroom accessories | OM | n/a | No | 2.7(c)1.vii. Countertops aren't named; treated as "non-structural elements" ⚠️ A-3 |
| KB-02 | Replace or install flooring | OM | n/a | No | 2.7(c)1.ix |
| KB-03 | Paint, wallpaper, trim, tile on walls | OM | n/a | No | 2.7(c)1.i, iii, viii |
| KB-04 | Drywall/plaster on **less than 25%** of wall area | OM | n/a | No | 2.7(c)1.ii |
| KB-05 | Drywall/plaster on **25% or more** of wall area, or any paneling | MW | F110 | No | Not OM under 2.7(c)1.ii; renovation with no structural change is MW, 2.17A(c)1.ii |
| KB-06 | Replace a sink, toilet, tub or shower with a similar fixture in the **same location, same piping** | OM | n/a | No | 2.7(c)2.x. Faucets and valves (incl. shower valves): 2.7(c)2.vi–viii |
| KB-07 | Add a fixture in existing space, with no upsizing of water distribution, water service or house drain | MW | F130 | No | 2.17A(c)2 |
| KB-08 | **Relocate** a fixture (any change in piping arrangement) | FULL | F130 | Plumbing riser/isometric may be requested ❓ Q-5 | Piping alteration excluded from OM, 2.7(b)6.ii; relocation isn't in the MW list |
| KB-09 | Replace existing piping with like-capacity piping | MW | F130 | No | 2.17A(c)2 |
| KB-10 | Replace receptacles, switches or light fixtures like-for-like | OM | n/a | No | 2.7(c)3.i. GFCI/TR rules still apply (NEC 406.4(D)) |
| KB-11 | Add **5 or fewer** outlets on existing circuits with adequate capacity | MW | F120 | No | 2.17A(c)4 |
| KB-12 | New circuit for a range, oven, dryer or A/C | MW | F120 | No | 2.17A(c)4 ("incidental to the installation of…") |
| KB-13 | Any other new circuits, more than 5 outlets, or a panel/service change | FULL | F120 | No (service upgrade: utility coordination flag) | Wiring alteration excluded from OM, 2.7(b)6.iii |
| KB-14 | Replace dishwasher, range, oven or dryer; no change in fuel, pipe size, location or electrical | OM | n/a | No | 2.7(c)2.xi, 3.iv, 5.vii–viii |
| KB-15 | Replace range hood: ≤ 400 cfm (or no higher than existing), recirculating or vented independently outdoors | OM | n/a | No | 2.7(c)3.v, 5.vi |
| KB-16 | New hood, or hood > 400 cfm | FULL | F120 + F145 ⚠️ A-4 | No | Hoods over 400 cfm may need make-up air (IRC M1503.6) ❓ Q-6 |
| KB-17 | Replace bath exhaust fan, vented independently outdoors | OM | n/a | No | 2.7(c)5.ix |
| KB-18 | New bath exhaust fan where none existed | MW | F120 (+ F110 only if wall/roof framing is cut) | No | New wiring on existing circuit: 2.17A(c)4 ⚠️ A-5 |
| KB-19 | New or relocated **gas** line (range, dryer) | FULL | F130 (gas piping) | No | Gas piping excluded from OM, 2.7(b)6.ii. F130 and F145 both list gas piping; v1 puts it on F130 ⚠️ A-6 |
| KB-20 | Remove or move a **non-bearing** wall | MW | F110 | Floor plan sketch ⚠️ A-7 | Reconfiguring space is renovation; MW if no primary structural members are altered, 2.17A(c)1.ii |
| KB-21 | Remove or cut a **bearing** wall, beam or post | FULL | F110 | **Yes, sealed by NJ architect or engineer** | 2.7(b)1–2; outside MW, 2.17A(c)1.ii |
| KB-22 | Replace a window or door in the same opening, no change to size or framing | OM | n/a | No | 2.7(c)1.v. If it's an egress window, net clear opening can't shrink |
| KB-23 | New or enlarged window/door opening | FULL | F110 | Yes (header detail); sealed ⚠️ A-7 | Structural, 2.7(b)2. **Exterior work, so the zoning trigger applies** |
| KB-24 | Any work in a building with lead abatement | FULL | F110 (+ lead form) | n/a | Excluded from OM and MW, 2.7(b)7 / 2.17A(c)6. v1: flag "out of scope, call the office" |

### 2.2 Finished basement (FB)

Finishing a basement almost always combines several items, so the job usually lands at MW or FULL even if individual items are OM.

| ID | Condition | Tier | Forms | Plans | Notes / citation |
|---|---|---|---|---|---|
| FB-01 | Frame new non-bearing partitions; drywall; ceiling | MW | F110 | **Yes**: floor plan showing room uses, ceiling height, egress, smoke/CO alarm locations ⚠️ A-7 | Renovation with no primary structural change, 2.17A(c)1.ii. Drywall here will almost always exceed 25% (KB-05 logic) |
| FB-02 | Insulation (non-foam), installed against interior finish | OM | n/a | No | 2.7(c)1.xv. Foam plastic insulation isn't OM; it goes on F110 |
| FB-03 | Space becomes **habitable** (family room, office, bedroom) | Same as FB-01 | F110 | Same as FB-01 | Flag: ceiling height for habitable space (IRC R305) ❓ Q-7 |
| FB-04 | A **bedroom** is created | FULL | F110 | Yes; show the emergency escape opening | Emergency escape & rescue opening required (IRC R310). If no compliant window exists, see FB-05 |
| FB-05 | New or enlarged egress window / areaway (foundation cut) | FULL | F110 | **Yes, sealed** | Structural, 2.7(b)2. **Exterior work, so the zoning trigger applies.** May affect impervious coverage |
| FB-06 | New bathroom (toilet, lav, shower) | MW if no upsizing of the drain/water system (2.17A(c)2); otherwise FULL | F130 (+ F120 for fan/lights) | Plumbing riser ❓ Q-5 | Below-grade toilet may need an ejector pump: F130 "Sewer Pump" line, which pushes it to FULL ⚠️ A-8 |
| FB-07 | Electrical: lights, outlets, circuits | Per KB-10 to KB-13 | F120 | No | A basement finish usually exceeds 5 outlets, so usually FULL |
| FB-08 | Smoke and CO alarms | Hardwired: MW (2.17A(c)5.i); battery or plug-in: OM (2.7(c)4.iii–iv) | F120 (hardwired, "Detectors" line) | Show on floor plan | Flag: confirm whether the office requires interconnected alarms in the finished area ❓ Q-8 |
| FB-09 | Extend ductwork / add supply registers | OM if repair or replacement (2.7(c)5.iii); extending into new space ⚠️ A-9 treats as MW | F145 if MW ⚠️ A-9 | No | Flag: furnace capacity for added conditioned space is the reviewer's call |
| FB-10 | Bearing wall, post or beam changes | FULL | F110 | **Yes, sealed** | Same as KB-21 |
| FB-11 | Fuel-fired appliance (furnace, water heater) is in or next to the new finished room | Flag only | (F145 if the appliance is touched) | Show on plan | Flag: combustion air and clearances. Reviewer will check |

### 2.3 Roof replacement (RF)

| ID | Condition | Tier | Forms | Plans | Notes / citation |
|---|---|---|---|---|---|
| RF-01 | Repair or replace existing roof covering on a **detached** one- or two-family dwelling | OM: **no permit** | n/a | No | 2.7(c)1.x. App produces a "no permit needed" sheet. Zoning: like-for-like, so ZN-03 note |
| RF-02 | Same, on an **attached** dwelling (twin, townhouse) | MW | F110 | No | 2.7(c)1.x is limited to detached dwellings; re-roofing an attached dwelling is renovation with no structural change, 2.17A(c)1.ii ⚠️ A-10 |
| RF-03 | Replace damaged **sheathing/decking** in addition to the covering | Same tier as RF-01/02 ⚠️ A-11 | Same | No | Code doesn't address decking explicitly. Treated as part of the roof covering repair unless rafters are touched |
| RF-04 | Repair or replace **rafters, joists or ridge** (any structural member) | FULL | F110 | **Yes, sealed** | 2.7(b)2, (b)4 |
| RF-05 | Add a skylight or other new roof opening | FULL | F110 | Yes (framing detail) | Cutting structural members. Exterior, so zoning applies |
| RF-06 | Change roof shape, pitch or height; add a dormer | FULL | F110 | **Yes, sealed** | Structural; and height/bulk is a zoning matter, so **zoning applies** |
| RF-07 | Replace gutters and leaders | OM | n/a | No | 2.7(c)1.xvi |
| RF-08 | Replace siding (not polypropylene) | OM | n/a | No | 2.7(c)1.xi. Often bundled with roof jobs |
| RF-09 | Third layer of roofing / roof-over existing | TIP | n/a | n/a | IRC R908 limits re-cover. Not a permit question; non-blocking tip (§4.6) |

### 2.4 HVAC (HV)

F145 (Mechanical Inspection) exists only for R-3/R-5 dwellings and covers furnaces, boilers, water heaters, gas and oil piping connections, fireplaces and generators, with a Cooling/AC inspection line. That makes it the main HVAC form in v1.

| ID | Condition | Tier | Forms | Plans | Notes / citation |
|---|---|---|---|---|---|
| HV-01 | Replace a furnace, low-pressure boiler, A/C unit or condenser with one of **like capacity** | MW | F145 + F120 (equipment electrical) | No | 2.17A(c)3. Electrical: 2.17A(c)4. Fuel-fired: attach **F370** chimney verification |
| HV-02 | Replace with **different capacity**, or **change fuel type** (e.g. oil → gas) | FULL | F145 + F120; + F130 for new gas line (⚠️ A-6) | Possibly (load calc) ❓ Q-10 | Outside 2.17A(c)3 "like capacity". Oil tank removal: flag separately (out of scope) |
| HV-03 | **New** system where none existed (central A/C, heat pump, mini-split) | FULL | F145 + F120 (+ F110 only if wall/roof framing is cut; line-set and vent holes don't count) | Possibly (equipment location + load calc) ❓ Q-10 | Not a replacement, so not MW. New outdoor unit: **exterior, so zoning applies** (setbacks) |
| HV-04 | Replace a water heater with like capacity | MW | F145 ⚠️ A-6 (+ F370 if fuel-fired) | No | 2.17A(c)2. Water heater appears on both F130 and F145 |
| HV-05 | Repair or replace ductwork | OM | n/a | No | 2.7(c)5.iii |
| HV-06 | Replace motors, pumps, fans of same capacity; repair A/C; replace controls/thermostats | OM | n/a | No | 2.7(c)5.i, iv, v |
| HV-07 | Repair or replace heating supply/return piping or radiators, no rearrangement | OM | n/a | No | 2.7(c)5.ii |
| HV-08 | Rearrange hydronic piping or add zones | FULL ⚠️ A-12 | F145 | No | Not in either list |
| HV-09 | New or modified chimney/vent; direct-vent conversion | FULL | F145 (+ F110 for new wall/roof penetration) | No | Chimney liner (liquid applied) is OM, 2.7(c)5.x |
| HV-10 | Condenser relocated to a new spot | FULL | F145 + F120 | Site sketch | **Exterior, so zoning applies** (setbacks) |
| HV-11 | Like-for-like condenser in the **same location** | MW (as HV-01) | As HV-01 | No | Zoning: like-for-like, so ZN-03 note |

---

## 3. Facts the rules need (drives the follow-up questions)

The AI extracts these from the description. Anything the rules use that comes back `unknown` becomes a follow-up question, phrased by the AI. Only the questions a job actually needs get asked.

| Fact | Used by | Example question |
|---|---|---|
| Dwelling type: detached 1-family / detached 2-family / attached | Scope, RF-01 vs RF-02 | "Is the house detached, or does it share a wall with a neighbor?" |
| Property class (from parcel data, `PROP_CLASS = 2`) | Scope | (auto; contractor confirms) |
| Estimated cost of work, split by trade | F100 §IIb + each tech section (CQ-02…04) | "Roughly what's the contract value for the building work? Plumbing? Electrical?" |
| Any work outside the building envelope | Zoning (§4.1) | "Does any of the work change the outside of the house: new openings, equipment, or roofline?" |
| Fixtures: replaced in place / added / relocated | KB-06/07/08, FB-06 | "Is the sink staying where it is?" |
| Drain/water-line upsizing needed | KB-07 vs FULL, FB-06 | "Will the new fixtures need a bigger drain or water line?" |
| Below-grade toilet needing ejector | FB-06 | "Will the basement bathroom need an ejector pump?" |
| Outlets added (count); new circuits; panel/service change | KB-11/12/13, FB-07 | "How many new outlets or lights, and any new circuits or panel work?" |
| Wall removed: bearing / non-bearing / unknown | KB-20/21 | "Is the wall being removed load-bearing?" (unknown → treated as bearing) |
| Wall-area of new drywall ≥ 25% | KB-04/05 | "Are you replacing more than about a quarter of the wall surface?" |
| Gas line new/relocated | KB-19, HV-02 | "Are you running or moving any gas line?" |
| Range hood cfm and venting | KB-15/16 | "What's the hood's cfm, and does it vent outside?" |
| Bedroom being created | FB-04 | "Will any finished basement room be used as a bedroom?" |
| Existing egress window | FB-04/05 | "Is there already a window big enough to climb out of?" |
| Roof: covering only / decking / rafters / skylight / shape change | RF-01…06 | "Any structural repairs or new skylights, or just shingles and decking?" |
| HVAC: replacement vs new; like capacity; fuel change; same location | HV-01…11 | "Same size and fuel as the old unit, in the same spot?" |
| Year built (from parcel `YR_CONSTR`) | Lead flag (pre-1978) | (auto) |

Rule for unknowns: take the conservative branch (e.g. unknown bearing → KB-21) and show "Assumed load-bearing because it wasn't known. Change if you confirm otherwise."

---

## 4. Cross-cutting rules

### 4.1 Zoning prior approval: Maplewood (municipal rule data)

| ID | Condition | Result | Basis |
|---|---|---|---|
| ZN-01 | All work items are interior | **No zoning application** ⚠️ A-13 | Settled v1 assumption; config flag `interior_alterations_require_zoning: false` |
| ZN-02 | Exterior work that changes something zoning regulates: **footprint, height, openings** (new or enlarged windows, doors, skylights, egress areaways; small duct, vent and line-set penetrations aren't openings), **new outdoor equipment** (or relocated), or **lot coverage** (impervious surface) | **Zoning permit required before submission.** Checklist: Maplewood residential zoning application, survey to scale showing the work, impervious coverage calculation, $50 fee | Ch. 271; Maplewood residential zoning application. Owner decision 2026-10-22 |
| ZN-03 | Exterior work that is **like-for-like replacement** and changes none of the ZN-02 items (reroof, siding, gutters, same-spot condenser, window in same opening) | **Not required (note):** "Zoning permit probably not required for like-for-like replacement. Confirm with Maplewood Zoning, 973-762-8120 ext. 5602." ⚠️ A-15 | Config flag `exterior_like_for_like_requires_zoning: false`. Owner decision 2026-10-22 |
| ZN-04 | Job is OM only (no construction permit) but ZN-02 applies | Output a "no construction permit, but a zoning permit applies" sheet | Rare in v1 (e.g. new outdoor equipment with no other work) |
| ZN-05 | Zoning trigger fact is `unknown` (e.g. "does the condenser move?") | Ask; if still unknown, treat as ZN-02 (required) and say so | Conservative-branch rule (§3) |

### 4.2 Forms and signers

| Form | Included when | Signed by | Notes |
|---|---|---|---|
| **F100** Construction Permit Application | Every MW or FULL job | Owner, or agent (contractor) with the owner authorization page attached | Owner authorization page is our own, not a DCA form |
| **F110** Building | Any building item (walls, drywall ≥ 25%, structural, openings, attached reroof) | General contractor (applicant) | |
| **F120** Electrical | Any electrical item | Licensed electrical contractor ⚠️ A-2 | Form has "Sign and Seal" and a Licensed/Exempt checkbox. HVAC equipment hookup: ❓ Q-3 |
| **F130** Plumbing | Any plumbing item, gas piping (⚠️ A-6) | Licensed master plumber ⚠️ A-2 | "Sign and Seal" |
| **F145** Mechanical Inspection | Furnace, boiler, A/C, water heater (⚠️ A-6), fireplace, generator, fuel connections, R-3/R-5 only | Licensed HVACR contractor (or master plumber for water heater/gas) ⚠️ A-2 | "Sign and Seal" |
| **F140** Fire Protection | Not used in v1 R-3/R-5 scope; F145 covers fuel-fired appliances there ⚠️ A-14 | (Fire alarm/suppression contractor) | Would apply to sprinklers or a monitored fire alarm |
| **F370** Chimney Verification | Replacing fuel-fired equipment (HV-01, HV-04) | HVACR contractor / chimney professional ❓ Q-4 | |
| **F390 / F392** Framing / Air-barrier checklists | Possibly FB-01 and KB with new framing ❓ Q-4 | | Listed on DCA forms page; unclear when Maplewood wants them |

All tech sections ask for: block/lot/qualifier, work site, owner, contractor, license # and expiry, **HIC registration #**, FEIN, use group, estimated cost of that trade's work, and description of work. All pre-fillable from the profile, subcontractor directory and parcel lookup.

### 4.3 Plans

| ID | Condition | Result |
|---|---|---|
| PL-01 | Any structural item (KB-21, KB-23, FB-05, FB-10, RF-04, RF-05, RF-06) | **Plans required, sealed by an NJ-licensed architect or engineer.** Packet flags it; never generated |
| PL-02 | Space reconfiguration or new habitable space (KB-20, FB-01, FB-03, FB-04) | **Floor plan required** ⚠️ A-7: whether an unsealed contractor sketch is accepted, and when a seal is needed ❓ Q-2 |
| PL-03 | New system / capacity change (HV-02, HV-03) | Flag only: equipment location + load calc may be requested ❓ Q-10. |
| PL-04 | Everything else (replacements, MW trade work) | No plans |

### 4.4 What the contractor fills in: work type, cost and quantities

Owner decision 2026-10-22: **no fee calculation in v1.** Every fee box on F100 and the technical sections is marked office use only, and the office calculates the fee. The engine fills in what the applicant is responsible for: the type of work, the estimated cost by subcode, and the quantity lines on each technical section. The Maplewood fee schedule is kept in [Appendix A](#appendix-a-deferred-to-v2-fee-estimate) in case a quote-time estimate is added later.

| ID | Field(s) | Rule |
|---|---|---|
| CQ-01 | F100 §IIa Proposed work | Exactly one box. **Minor Work** if the job tier is MW. Otherwise **Alteration** if any permitted item rearranges space, adds or removes a door, window or skylight, extends or rearranges a system, adds fixtures or equipment, or touches structure; else **Renovation** (replacing existing elements without changing the layout) ⚠️ A-21 |
| CQ-02 | F100 §IIb Subcodes + Est. Cost | Check each subcode that has a section in the packet and enter that trade's cost; Total Cost = sum. F100 has no Mechanical row, so F145 cost goes on the **Plumbing** row ⚠️ A-20 ❓ Q-11 |
| CQ-03 | Which costs count | Only trades with a section in the packet. A trade whose items are all ordinary maintenance is left out (e.g. cabinets and counters with no F110) ⚠️ A-16 |
| CQ-04 | Tech section "Est. Cost of … Work" | That trade's cost. On F110: the **Rehabilitation** line and the Total line (New Bldg. blank) |
| CQ-05 | F110 Type of Work | **Rehabilitation** for interior or alteration work; **Roofing** for roof items; **Siding** for siding; check all that apply |
| CQ-06 | Use group (F100 §VII, every tech section) | **R-5** for one- and two-family dwellings, present and proposed ⚠️ A-19 |
| CQ-07 | Quantity lines (F120 devices/detectors/kW items, F130 fixtures, F145 equipment) | One count per form line, covering every fixture, device or appliance installed for that trade in the job, including like-for-like ones once the section is in the packet ⚠️ A-17. Hardwired smoke/CO combination units go on the F120 Detectors line, marked Smoke ⚠️ A-18. Items with no form line go on "Other" with a short label |
| CQ-08 | Size columns (F120 kW / amps / HP) and other equipment details (e.g. F145 fuel type) | Fill in when the contractor gave the detail. Otherwise leave blank and add "fill in sizes/details" for that subcontractor on the cover checklist. No follow-up question, since the sub completes and signs that section anyway (A-2) |
| CQ-09 | F145 Heating system checkboxes | New / Replacement / Conversion / Modification, Hydronic / Hot Air, and fuel, from the HVAC facts. Leave blank for cooling-only work |
| CQ-10 | All "Fee (Office Use Only)" boxes, surcharges, F100 §V | Left blank |

### 4.5 Licensing and registration flags

| ID | Check | Flag |
|---|---|---|
| LC-01 | Contractor profile missing HIC registration # | "NJ home improvement contractors must be registered. Add your HIC # or exemption reason" |
| LC-02 | F120/F130/F145 included but no matching licensed sub in the directory | "Add the licensed electrician / plumber / HVACR contractor who'll sign this section" |
| LC-03 | Sub's license expiry before today | "License expired" (blocks printing until fixed or overridden) |
| LC-04 | Year built before 1978 | Info: lead-safe work practices may apply. Not a permit item |
| LC-05 | Owner is doing the trade work themselves | Out of scope for v1 (homeowner-exempt path); flag and stop |

### 4.6 Reviewer tips (non-blocking)

Owner decision 2026-10-22: include a few warnings a plan reviewer would raise even though they aren't permit rules. They are labeled **Tip**, never change the classification or forms, and never block printing.

| ID | Trigger | Tip |
|---|---|---|
| TP-01 | Roof-over or third layer (RF-09) | "Code limits re-covering over existing roofing (IRC R908). Expect tear-off to be required if there are already two layers." |
| TP-02 | Range hood > 400 cfm (KB-16) | "Hoods over 400 cfm generally need make-up air (IRC M1503.6). Be ready to show how it's provided." |
| TP-03 | Basement made habitable (FB-03) | "Reviewers check ceiling height in finished basements. Note the clear height on the floor plan." |
| TP-04 | Fuel-fired appliance near new finished space (FB-11) | "Show the furnace/water heater on the plan with clearances and combustion air." |
| TP-05 | Year built before 1978 (LC-04) | "Lead-safe work practices may apply to disturbing painted surfaces." |

### 4.7 Homeowner does their own trade work (approved 2026-10-26)

*From the approved [homeowner trade-work plan](plans/homeowner-trade-plan.md). Replaces the LC-05 stop for the licensed trades (electrical, plumbing, HVACR) on a contractor's job. Sources: `docs/research-notes.md`, "Homeowner trade work."*

**Basis.** N.J.A.C. 5:23-2.15(b)2.i allows unlicensed trade work only "in the case of a single-family homeowner on his or her own dwelling." DCA says to apply that within each trade's own licensing law (52 N.J.R. 10(1)). The licensing boards' answers by home type are in "License Check," *Construction Code Communicator* 31:1 (Spring 2019), pp. 6–7.

**New facts.** These are asked only when the owner does at least one trade.

| Fact | Values | Used by | Example question |
|---|---|---|---|
| Who does each licensed trade (`performed_by.electrical / plumbing / mechanical`) | contractor's sub / owner | HO-01 to HO-06 | "Is anyone other than your subs doing electrical, plumbing or HVAC work, such as the owner?" |
| Who lives in the home (`owner_occupied`) | owner / immediate family only / no one in the family / unknown | HO-01 | "Does the owner live in the home? If not, does a member of their immediate family?" |
| Own sewer connection (`own_sewer`) | yes / no / unknown | HO-02, only for an attached home where the owner does plumbing | "Does this half of the twin have its own sewer line to the street, or is it shared with the neighbor?" |

Refrigerant work (HO-04) comes from the HVAC item's equipment type, so it needs no question. Unknown answers take the conservative branch: the owner isn't eligible for that trade.

**Eligibility rules.** A failed check blocks printing. The message says why, cites the law, and tells the contractor to assign a licensed sub for that trade.

| ID | Check | Result if it fails | Basis |
|---|---|---|---|
| HO-01 | The owner lives in the home. For **electrical only**, an immediate family member living there also counts | "The owner can do their own {trade} work only in a home they live in. Assign a licensed {trade person}." | 45:5A-18(n); 45:14C-12.4 and 13:32-1.4(f)1 ("his or her own dwelling"); 45:16A-9 ("personally occupies"); 2019 board answers 1b |
| HO-02 | Plumbing by the owner: `detached_1f`, or `attached` with its own sewer (`own_sewer: yes`) | Two-family: "NJ plumbing law lets only a single-family homeowner do their own plumbing. Assign a licensed master plumber." Shared sewer: "...because this home shares a sewer line with the neighbor..." ⚠️ A-26 | 45:14C-12.4; 13:32-1.4(f)1; Plumbing Board answers 2 and 3 |
| HO-03 | HVACR by the owner: `detached_1f` or `attached` | Two-family: "NJ HVACR law lets only a single-family homeowner do their own HVACR work. Assign a licensed HVACR contractor." ⚠️ A-26 | 45:16A-9; 13:32A-1.1(b)3; HVACR Board answer 2 |
| HO-04 | HVACR by the owner includes no refrigerant work: no A/C or condensing unit, heat pump or mini-split, new or replaced. Furnace, boiler, water heater, ductwork, controls and gas connections are fine | "Work on the {item} involves refrigerant, which the owner can't do under the homeowner exemption. Assign a licensed HVACR contractor for all the HVACR work (see HO-05)." ⚠️ A-24 | 45:16A-9 (CFC/HCFC exception), read conservatively |
| HO-05 | One signer per technical section: the owner does all of a trade's work on the job, or none of it | "One person must do and sign for all the {trade} work on this permit. Assign either the owner or {sub} to all of it." | Each section has a single signer and license block (F120/F130/F145 §C) |
| HO-06 | Electrical by the owner: any one- or two-family type in v1 scope, if HO-01 passes | (No separate failure; HO-01 covers it) ⚠️ A-23 | 45:5A-18(n); Electrical Board answer |
| LC-05 *(narrowed)* | The owner is doing **building-section** (F110) work on a contractor's job | Still a stop: "Out of scope: the owner doing building work themselves isn't supported." | Owner "perform or supervise" (F100 box C.1) changes who's responsible for the job |

**When every owner-performed trade passes, forms and signers change as follows** (everything else as in §4.2):

| ID | Form | Entry |
|---|---|---|
| HO-F1 | F100 | The **owner is the applicant**. Owner Section: box C checked; **C.3 Electrical** and/or **C.4 Plumbing** for the trades the owner does; **D** checked (contractors are on the job). C.1 and C.2 are left blank. The Agent Section is left blank. Hollis stays on page 1 as Principal Contractor. The owner signs. There's no box for HVACR ❓ Q-13 |
| HO-F2 | Owner authorization page | Left out. The owner signs F100 themselves |
| HO-F3 | Each owner-performed section (F120 / F130 / F145) | **Exempt Applicant** checked. The contractor block gets the owner's name, address, phone and email. License box: "Exempt: homeowner, N.J.S.A. 45:5A-18(n)" (F120), "Exempt: homeowner, N.J.S.A. 45:14C-12.4" (F130), or "Exempt: homeowner, N.J.S.A. 45:16A-9" (F145). License expiry blank. HIC box: "Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii". FEIN blank. The owner signs |
| HO-F4 | F370, when the owner replaces a fuel-fired appliance | Signed by the owner ❓ Q-13 |
| HO-F5 | Estimated cost of an owner-performed trade (CQ-02, CQ-04) | The figure the contractor enters for the owner's work. If none is stated, ask: "What's the estimated cost of the owner's {trade} work?" ⚠️ A-27 ❓ Q-14 |
| HO-F6 | Fill-ins (CQ-08) | Sizes the contractor didn't give go to the owner as signer: "Owner: fill in kW sizes for dishwasher and disposal" |
| — | LC-02, LC-03 | Not raised for a trade the owner does (no sub, no license) |

**Cover checklist lines** (shown when the owner does any trade):

| ID | Line |
|---|---|
| HO-T1 | "You must do the {trade} work yourself. Under the homeowner exemption, friends, relatives or a handyman can't do it for you." (45:16A-9 "solely performs"; town guidance) |
| HO-T2 | "The estimated cost for your {trade} work is the figure given ({amount}). Ask the construction office whether to include the value of your own labor." (A-27) |

---

## 5. Assumptions register

Each will be a configurable entry in the rule data with a "how to confirm" note, and each is shown in the app when it affects a job.

| ID | Assumption | How to confirm |
|---|---|---|
| A-1 | The LII copy of 2.7 / 2.17A is the current text | Check the current N.J.A.C. on the OAL/LexisNexis NJ site, or DCA Code Assistance (609-292-7898) |
| A-2 | Each licensed trade signs its own technical section (F120/F130/F145) | Ask Maplewood Construction Office (brief next step #1) |
| A-3 | Countertops count as non-structural "furnishings" (OM) | DCA Code Assistance |
| A-4 | A new range hood > 400 cfm goes on F145 + F120 | Construction office |
| A-5 | A new bath fan on an existing circuit is MW | Construction office |
| A-6 | Gas piping goes on F130; water heaters go on F145 (both appear on both forms) | Construction office: which section they want for each |
| A-7 | An unsealed contractor floor plan is acceptable for non-structural reconfiguration and basement finishes | Construction office (see Q-2) |
| A-8 | A basement ejector pump pushes the bathroom to FULL | Construction office |
| A-9 | Extending ductwork into new finished space is MW on F145 | Construction office |
| A-10 | Reroofing an attached dwelling is MW (not FULL) | DCA Code Assistance |
| A-11 | Replacing decking/sheathing stays within "roof covering" repair | DCA Code Assistance |
| A-12 | Rearranging hydronic piping is FULL | Construction office |
| A-13 | Purely interior work needs no zoning application (settled v1 assumption) | Maplewood Zoning, 973-762-8120 ext. 5602 |
| A-14 | F140 isn't needed for the four v1 project types in R-3/R-5 | Construction office |
| A-15 | Like-for-like exterior replacement needs no zoning permit (shown as a "confirm with Zoning" note) | Maplewood Zoning, 973-762-8120 ext. 5602 |
| A-16 | The estimated cost on the permit is the contract value of the trades that have a section in the packet; trades with only ordinary-maintenance items are left out | Construction office |
| A-17 | Quantity lines count every fixture/device installed for that trade in the job, including like-for-like ones | Construction office |
| A-18 | Hardwired smoke/CO combination alarms go on the F120 Detectors line, marked Smoke | Construction office |
| A-19 | One- and two-family dwellings (incl. twins) are use group R-5 on the forms | Construction office |
| A-20 | With no Mechanical row on F100, F145 work is costed on the Plumbing row | Construction office (Q-11) |
| A-21 | F100 "Alteration" vs "Renovation" follows the Rehabilitation Subcode definitions (N.J.A.C. 5:23-6.3) as summarized in CQ-01 | DCA Code Assistance |
| A-22 | *(M2, in the rule data)* Submit one original plus three copies of each form | Maplewood Construction Office |
| A-23 | An owner (or immediate family) living in a two-family home may do their own electrical work, per the Electrical Board's 2019 answer. Config switch `two_family_owner_electrical: true` | Maplewood electrical subcode official (Q-15). At least one town (Ridgefield Park) reads it the other way |
| A-24 | The owner may do **no** refrigerant work at all (A/C, heat pump, mini-split), not only the CFC/HCFC work the HVACR law names | HVACR Board (Division of Consumer Affairs) |
| A-25 | The statute text in §4.7 (read on onecle, FindLaw and Cornell LII) matches the official text | Official NJ statutes (pub.njleg.gov) and N.J.A.C., as with A-1 |
| A-26 | An owner living in a two-family home may **not** do their own plumbing or HVACR work, per the "single family" wording in both laws and the 2019 board answers. Config switch `two_family_owner_plumbing_hvacr: false`; set to `true` to allow it | Plumbing Board and HVACR Board, or DCA Code Assistance at (609) 984-7609 (Q-16) |
| A-27 | The estimated cost of an owner-performed trade is the figure entered for it (no added value for the owner's labor) | Construction office (Q-14) |

---

## 6. Open questions

Resolved by owner (2026-10-22):

- **Q-1. Like-for-like exterior work and zoning.** Zoning is required only for exterior work that changes footprint, height, openings, outdoor equipment or lot coverage. Like-for-like replacement gets a "probably not required, confirm with Zoning" note. See ZN-02/03.
- **Q-9. Reviewer-style warnings.** Included as non-blocking tips. See §4.6.
- **Fees.** Cut from v1: the office calculates fees. The engine fills in work type, cost and quantities instead (§4.4). Maplewood schedule kept in Appendix A.

Questions for the Maplewood Construction Office (add to the existing call list):

- **Q-2.** When is an unsealed contractor sketch accepted (wall moves, basement finish), and when must plans be sealed?
- **Q-3.** For a like-for-like A/C or furnace swap that reconnects to the existing dedicated disconnect (25 tons or less, 240 volts or less; N.J.A.C. 13:32A-1.2 and 1.3), is an F120 needed at all? If it is, who signs it: an electrician, or the HVACR contractor? *(Reworded 2026-10-28; was: "For an A/C or furnace swap, who signs F120: an electrician, or the HVACR contractor?")*
- **Q-4.** Do they want F370 on every fuel-fired replacement, and F390/F392 on basement finishes?
- **Q-5.** Do they want a plumbing riser diagram for relocated or added fixtures?
- **Q-6.** Make-up air for range hoods over 400 cfm: what do they need to see?
- **Q-7.** Minimum ceiling height they enforce for finished basements.
- **Q-8.** Do they require hardwired interconnected smoke/CO alarms when a basement is finished?
- **Q-10.** For new or resized HVAC, do they want a Manual J load calculation?
- **Q-11.** F100 has no Mechanical row in §IIb. Where do they want the cost of F145 work: the Plumbing row, or written in?

Homeowner trade work (approved 2026-10-26; §4.7):

- **Q-12.** When the owner does one trade and a contractor does the rest, is it one application with the owner as applicant, or a separate permit for the owner's trade?
- **Q-13.** F100's Owner Section has no mechanical box. For owner HVACR work, is F145's "Exempt Applicant" box enough, or do they want something written in? And who signs F370 when the owner replaces a fuel-fired appliance themselves?
- **Q-14.** What estimated cost goes on an owner-performed section: materials only, or materials plus the value of the labor? (A-27)
- **Q-15.** Do they follow the Electrical Board on two-family homes, i.e. can an owner living there do their own electrical? (A-23)
- **Q-16.** Can an owner who lives in a two-family home do their own plumbing or HVACR work? (A-26) Ask the Maplewood plumbing subcode official. For a definitive state answer, ask the Board of Examiners of Master Plumbers and the HVACR Board (Division of Consumer Affairs), or DCA Code Assistance at (609) 984-7609, and whether the 2019 "License Check" answers still stand.

---

## Sources

- N.J.A.C. 5:23-2.7 Ordinary maintenance: https://law.cornell.edu/regulations/new-jersey/N-J-A-C-5-23-2-7
- N.J.A.C. 5:23-2.17A Minor work: https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-5-23-2-17A
- DCA construction permit forms index (F100–F155, F370, F390, F392): https://www.nj.gov/dca/codes/resources/constructionpermitforms.shtml
- F120, F130, F140, F145 fillable PDFs (rev. 12/25): https://www.nj.gov/dca/codes/forms/pdf_ucc_stdforms/
- Maplewood zoning application ($50, survey, impervious coverage): see `docs/research-notes.md`
- F100 (rev. 8/23, 11/2014, 12/07) and F110 (rev. 12/25): https://www.nj.gov/dca/codes/forms/pdf_ucc_stdforms/
- Maplewood fee schedule (Appendix A only): Code Ch. 93 §A, through Ord. No. 4001-26 (5-19-2026), https://ecode360.com/9419720 (text supplied by owner; site blocks automated access)
- N.J.A.C. 5:23-4.19 State permit surcharge (Appendix A only): https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-5-23-4-19

---

## Appendix A: Deferred to v2 (fee estimate)

Cut from v1 on 2026-10-22 because the office calculates fees and the estimate isn't needed to file. Kept here in case contractors ask for a fee estimate when quoting a job. Not used by the v1 engine or tests.

### Maplewood fee schedule (as of Ord. No. 4001-26)

Source: Maplewood Code Ch. 93 §A (Uniform Construction Code fees), as amended through Ord. No. 4001-26 (5-19-2026), pasted by owner 2026-10-22. State surcharge from N.J.A.C. 5:23-4.19. Only the lines our four project types can hit are listed; the rest of the ordinance (new construction volume, demolition, signs, solar, sprinklers, etc.) is out of v1 scope.

**Building (F110)** · §A(5)

| ID | Item | Fee |
|---|---|---|
| FE-B1 | Renovations, alterations, repairs | **$30 per $1,000** of estimated cost of building work (note F-1) |

**Plumbing (F130)** · §A(7)

| ID | Item | Fee |
|---|---|---|
| FE-P1 | Per fixture: water closet, urinal/bidet, bathtub, lavatory, shower, floor drain, sink, dishwasher, washing machine, hose bibb, drinking fountain, (non-testable) backflow preventer | **$20 each** |
| FE-P2 | Special devices: water heater, gas piping, fuel oil piping, sewer pump (ejector), steam boiler, hot water boiler, interceptor/separator, grease trap, sewer connection, water service connection, water-cooled A/C | **$75 each** |
| FE-P3 | Testable backflow preventer | $100 each |
| FE-P4 | Gas service connection | No charge |

**Electrical (F120)** · §A(8)(b), municipal schedule (applies "if other than a third-party agency") (note F-2)

| ID | Item | Fee |
|---|---|---|
| FE-E1 | Receptacles and fixtures (incl. switches/devices): first 50 | **$75** (block) |
| FE-E2 | Each additional 25, or part thereof | $20 (note F-3) |
| FE-E3 | Appliances/equipment over 1 kW up to 10 kW: range, oven, electric water heater, electric dryer, dishwasher, disposal, space heater, boiler, furnace, air handler, A/C compressor 1–5 tons | **$20 each** (note F-4) |
| FE-E4 | A/C over 5 tons (treated as >10–50 kW) | $50 each |
| FE-E5 | Motors over 1 HP, up to 10 HP | $10 each |
| FE-E6 | Service panel, service entrance or subpanel ≤ 200 A | $75 each |
| FE-E7 | Service panel > 200 A up to 1,000 A | $185 each |
| FE-E8 | Each branch circuit replacement; each 30–50 A receptacle; each fire/security alarm control unit | $10 each |

**Mechanical (F145)** · §A(20)

| ID | Item | Fee |
|---|---|---|
| FE-M1 | Mechanical permit for residential boilers, furnaces and similar devices | **$125** per permit (note F-5) |

**Fire (F140)**: not used in v1 (A-14). For reference: smoke/heat detectors 1–20 = $65; gas/oil-fired appliance = $75 each (§A(9)). Note F-6 covers hardwired smoke/CO alarms, which v1 counts as electrical devices.

**Rules that apply across subcodes**

| ID | Rule | Value | Source |
|---|---|---|---|
| FE-X1 | Minimum fee | **$80 per subcode section** (note F-7) | §A(7)(c), (8), (9)(a)[4], (15) |
| FE-X2 | Municipal plan review | **25% of the calculated permit fee**, added only when plans are flagged (PL-01…03) (note F-8) | §A(16) |
| FE-X3 | Administrative surcharge | 15%, **only if** Maplewood uses a third-party inspection agency. v1 assumes it doesn't (note F-2) | §A(7)(e), (8), (9)(a)[6] |
| FE-X4 | State permit surcharge (DCA training fee) | **$1.90 per $1,000** of construction value for alterations; minimum $1.00 (note F-9) | N.J.A.C. 5:23-4.19 |
| FE-X5 | Certificate of approval (issued for alteration/minor work) | No charge | §A(13) |
| FE-X6 | Certificate of occupancy, if the office issues one instead (possible for a basement made habitable) | 10% of permit fee | §A(12) |
| FE-X7 | Rounding | Each fee rounded to the nearest dollar | §A(14) |
| FE-X8 | Zoning permit (separate, paid to Zoning) | **$50** | Maplewood residential zoning application |

**Interpretation notes if this is revived.** Each needs the construction office to confirm:
- **F-1.** Building fee is prorated ($30 × cost ÷ 1,000), not charged per *started* $1,000
- **F-2.** Maplewood inspects in-house: the municipal electrical schedule applies and there is no 15% administrative surcharge
- **F-3.** "Each additional 25" devices is charged per started block of 25
- **F-4.** A range is charged as a kW appliance ($20), not under "household cooking device up to 16 kW" ($10). The ordinance lists ranges in both
- **F-5.** The $125 mechanical permit is one flat fee per F145, covering all appliances on it (incl. a water heater)
- **F-6.** Hardwired smoke/CO alarms in a basement finish are counted as electrical devices (F120), not charged under fire ($65)
- **F-7.** The $80 minimum applies to each subcode section separately, not once per permit
- **F-8.** The 25% plan review fee is charged only when plans are submitted, not on every permit
- **F-9.** DCA surcharge is still $1.90 per $1,000 (5:23-4.19, last amended 2014; admin change 7/2024)
