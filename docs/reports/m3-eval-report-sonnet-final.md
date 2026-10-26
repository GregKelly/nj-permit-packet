# M3 eval report

*Generated 2026-10-26 by `npm run eval -- --models sonnet --runs 3 --record`. 3 run(s) per model. Test jobs: 13; eval-only descriptions: 10. *

Targets are from the approved [M3 plan](../plans/m3-plan.md) ("Evals and targets"). Scores are the worst over all runs, except missed facts, which are an average.

| Target | claude-sonnet-5-5 |
|---|---|
| **Guessed facts: zero, every run** | ✅ 0 |
| Wrong facts: zero | ✅ 0 |
| Missed facts: at most 1 per job on average | ✅ 0.04 |
| Same questions: every job, every run | ✅ 39/39 |
| Same result: every job, every run | ✅ 39/39 |
| Costs extracted exactly: every job | ✅ 39/39 |
| Flags, names, not-covered work: every eval-only case | ✅ 30/30 |
| Follow-ups quote the description (E-01, E-03, E-04) | ✅ 9/9 |
| Question checks pass: every run | ✅ 69/69 |
| Scope checks pass: every run | ✅ 27/27 |
| Answers that failed outright (no usable answer) | ✅ 0 |
| Cost per job, all three calls (average) | $0.020 |
| Cost of these answers (when first bought) | $1.37 |

## Failures

**J-10** · claude-sonnet-5-5 · run 1

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"

**J-10** · claude-sonnet-5-5 · run 2

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"

**J-10** · claude-sonnet-5-5 · run 3

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"


## Sample follow-up questions (run 1)

### claude-sonnet-5-5

**J-03**

- You mentioned "Rip out the tub, put in a walk-in tile shower." Does the new shower go in the same spot with the same piping, is it an extra fixture added in the existing space, or does it move so the drain or supply lines get rerouted? *(Same spot, same piping / Extra fixture, piping in existing space / Moved, drain or supply lines rerouted / Don't know)*
- You mentioned a double vanity instead of the single. Do the water lines or drain have to be made bigger for this work? *(Yes, bigger lines or drain needed / No, not made bigger / Don't know)*
- You mentioned a heated floor. Does the work need a new circuit from the panel, and if so, what kind? *(No new circuit, uses existing circuits / New circuit only for a range, oven, dryer or air conditioner / Other new circuit (counter outlets, lights, heated floor, etc.) / Don't know)*
- The application needs a single estimated dollar amount for the electrical work, and an estimate is fine. What figure should go on it? *(number)*
- The application needs a single estimated dollar amount for the plumbing work, and an estimate is fine. What figure should go on it? *(number)*

**J-04**

- You mentioned a family room and home office. Will any of the finished rooms be used as a bedroom? *(Yes, at least one will be a bedroom / No, none will be a bedroom / Don't know)*
- Is a furnace, boiler or water heater in or right next to the family room and home office? *(Yes, one is in or right next to the rooms / No, none is in or right next to the rooms / Don't know)*

**J-05**

- For turning the back half of the basement into a guest bedroom, is a furnace, boiler or water heater in or right next to the finished rooms? *(Yes, one is in or right next to the rooms / No, none is in or right next to the rooms / Don't know)*
- For the smoke and CO alarms in the new bedroom, how are they powered? *(Hardwired to the house wiring / Battery only / Plug-in / Don't know)*

**J-06**

- You mentioned tearing off and replacing the roof. How many layers of roofing are on the roof now? *(One layer / Two or more layers / Don't know)*
- You mentioned replacing a few sheets of rotted plywood. Are any rafters, joists or other roof framing also being repaired or replaced? *(Yes, some framing is repaired or replaced / No, no framing is touched / Don't know)*

**J-07**

- For the reroof on the left half of the twin, how many layers of roofing are on the roof now? *(One layer / Two or more layers / Don't know)*

**J-08**

- The application needs a single estimated dollar amount for the electrical work, and an estimate is fine. What figure should go on it? *(number)*

**J-09**

- The application needs a single estimated dollar amount for the electrical work, and an estimate is fine. What figure should go on it? *(number)*

**J-10**

- You mentioned replacing the old recirculating hood with a 900 cfm hood. Is the new hood more powerful (higher cfm) than the old one? *(Yes, the new hood has a higher cfm / No, the new hood does not have a higher cfm / Don't know)*

**J-11**

- Does the owner live in the home? *(Yes, the owner lives there / No, but the owner's immediate family lives there / No, neither (for example, a rental) / Don't know)*

**J-12**

- You mentioned a "Rec room". Will any of the finished rooms be used as a bedroom? *(Yes, a bedroom / No bedroom / Don't know)*
- For the rec room, is a furnace, boiler or water heater in or right next to the finished rooms? *(Yes, one is in or right next to them / No, none is in or next to them / Don't know)*
- For the half bath (toilet and sink, gravity drain, no pump), do the water lines or the drain have to be made bigger for the new bathroom? *(Yes, they must be made bigger / No, they don't need to be made bigger / Don't know)*
- The application needs a single estimated dollar amount for the electrical work. An estimate is fine. What figure should go on it? *(number)*
- The application needs a single estimated dollar amount for the plumbing work. An estimate is fine. What figure should go on it? *(number)*

**E-01**

- What kind of home is this? (Looking at the number of households and whether it shares a wall with another home, not the number of stories.) *(Detached single-family house / Two-family house (two households) / Attached single-family home sharing a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned a new window over the tub. Is the opening new, is an existing opening being made bigger, or is the window being replaced in the same opening, unchanged? *(New opening / Existing opening made bigger / Same opening, unchanged / Don't know)*

**E-03**

- You mentioned this is a single family home. Is it a detached single-family house, a two-family house, an attached single-family home that shares a wall (twin, townhouse, row house), a building with three or more homes, or not a home at all? *(Detached single-family house / Two-family house (two households) / Attached single-family home sharing a wall / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned somewhere around $14–16k depending on what you find under it. The application needs a single estimated cost; an estimate is fine. What figure should go on it? *(number)*

**E-04**

- What kind of home is this? (We mean the household setup and whether it shares a wall, not the number of stories.) *(Detached single-family house / Two-family house (two households) / Attached single-family home sharing a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned a new fan. Does installing the fan or its duct mean cutting any joists, studs or rafters? *(Yes, framing gets cut / No, no framing is cut / Don't know)*
- You mentioned the usual electrical. Does it only replace existing outlets, switches or lights like-for-like, or does it add new ones? *(Only replaces existing ones like-for-like / Adds new outlets, switches, lights or circuits / Don't know)*
- You mentioned the usual electrical. How many outlets, switches and light fixtures does the electrical work install in total? *(number)*

## Sample scope narratives (run 1)

### J-01

**claude-sonnet-5-5**

> Building: Install new drywall throughout. Remove the non-bearing wall between the kitchen and dining room.
>
> Electrical: Install 18 devices, including 8 recessed cans and island outlets, on two new 20A counter circuits.
>
> Plumbing: Relocate the sink to the new island. Connect 1 dishwasher and 1 disposal on the new run at the island.
>
> Also in this job: Install new cabinets. Install quartz countertops. Install LVP flooring. The gas range stays in place on the same gas hookup, with no change to the fuel, gas line or electrical.
>

### J-04

**claude-sonnet-5-5**

> Building: Install framing, drywall and a drop ceiling for new partitions. Spray foam the rim joists. Create habitable space for a family room and a home office. Neither room is a bedroom, and there is no fuel-burning appliance nearby.
>
> Electrical: Install 26 devices (14 recessed lights and 12 outlets) on new 20A circuits. Install 2 hardwired smoke/CO combination alarms tied into the existing alarm system.
>
> Plumbing: Install a new basement bathroom with 1 water closet, 1 lavatory and 1 shower. Install an ejector pit with an ejector pump for the bathroom.
>
> Mechanical: Extend the supply ductwork with 3 runs.
>

### J-08

**claude-sonnet-5-5**

> Electrical: Replace the gas furnace (80k BTU) with a unit of the same size, with no change in fuel. Replace the 3-ton A/C condensing unit with a unit of the same capacity in the same location.
>
> Mechanical: Replace the gas furnace (80k BTU) with a unit of the same size, with no change in fuel. Replace the 3-ton A/C condensing unit with a unit of the same capacity in the same location.
>
> Also in this job: Install a new thermostat.
>

### J-11

**claude-sonnet-5-5**

> Building: Install new drywall throughout. Remove the non-bearing wall between the kitchen and dining room.
>
> Electrical: Install 18 devices on two new 20A counter circuits, including 8 recessed cans and island outlets.
>
> Plumbing: Relocate the sink to the new island. Connect 1 dishwasher and 1 disposal on the new run.
>
> Also in this job: Install new cabinets. Install quartz countertops. Install LVP flooring.
>
