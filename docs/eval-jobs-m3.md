# M3 Eval-only descriptions

*Approved by Gregory Kelly, 2026-10-26. Part of the approved [M3 plan](plans/m3-plan.md) ("Evals and targets").*

These ten descriptions test the extract call on the mistakes it's most likely to make. Unlike the test jobs, they have **no expected determinations**. Each one lists only:

- **Must stay `unknown`:** facts the description doesn't actually state. Any value here is a **guessed fact**, and the target for guessed facts is zero.
- **Must extract:** facts the description does state plainly. A different value is a **wrong fact**; `unknown` is a **missed fact**.
- **Follow-ups** (E-01, E-03, E-04): the questions the engine asks for these facts, and the words from the description each question should quote (plan, "Changes after approval" 1–4). Wording varies; the quote and, for costs, the "one amount" rule are what's checked.
- **Must be flagged:** work returned separately as "not covered" instead of being forced into an item kind, or a name returned for plain code to match against the directory.

Facts not listed aren't scored for that description. Fact names are the ones in the fact schema (`src/engine/facts.ts`); `costs.*` left unstated means no amount (`null`). Addresses use real Maplewood street names with made-up house numbers, as in the test jobs.

After you approve them, they become eval fixtures in `tests/ai/eval-jobs/`.

---

## E-01 · "New window" (bath)

**What it tests:** "new window" sounds definite but doesn't say whether the opening changes.

> Hall bath at 12 Courter Ave. New toilet and vanity in the same spots, new tile floor, and a new window over the tub. $11,000.

| | |
|---|---|
| Must stay `unknown` | window `action` (same opening, new opening or bigger opening isn't said) |
| Must extract | toilet and vanity: `action: replace_same`; window: `opening: window`; `costs.total: 11000` |
| Follow-up (engine asks `window.action`) | Quotes "a new window over the tub". Example: *"You mentioned a new window over the tub. Is the opening new, is an existing opening being made bigger, or is the window being replaced in the same opening, unchanged?"* |

## E-02 · Deck (out of scope)

**What it tests:** work outside v1 must come back as "not covered", not as the nearest kind (e.g. `opening` or `finishes`).

> Kitchen at 30 Valley St: new cabinets and counters, and replace the back door with a slider in a wider opening. They also want a 12x16 deck off the new slider.

| | |
|---|---|
| Must be flagged | "12x16 deck" returned as not covered |
| Must extract | back door: `opening: exterior_door`, `action: enlarge`; cabinets and countertops as `finishes` |
| Must stay `unknown` | all costs (`null`) |

## E-03 · Cost as a range (roof)

**What it tests:** a range isn't a number. The AI must not pick the low end, high end or middle. Also, "single family" doesn't say detached: a twin is a single-family home too (the rules treat them differently, e.g. RF-02 and HO-02).

> Tear off and reroof 8 Baker St, single family, one layer on there now. Architectural shingles, new drip edge. Somewhere around $14–16k depending on what we find under it.

| | |
|---|---|
| Must stay `unknown` | `costs.total` (`null`; not 14000, 15000 or 16000); `dwelling_type` |
| Must extract | roof covering: `existing_layers: one` |
| Follow-ups (engine asks `costs.total` and `property.dwelling_type`) | Cost quotes "Somewhere around $14–16k" and asks for one estimated amount: *"You mentioned somewhere around $14–16k. The application needs a single estimated cost; an estimate is fine. What figure should go on it?"* Home type quotes "single family" and asks whether it's detached or attached (a twin or townhouse) |

## E-04 · "The usual electrical" (bath)

**What it tests:** vague trade work must not turn into invented counts or circuits.

> Full gut of the upstairs bath at 45 Jefferson Ave. Tub stays, new toilet and vanity in the same places, new tile. New fan, and the usual electrical. Total is $26k, electrician quoted $3,800.

| | |
|---|---|
| Must stay `unknown` | electrical `action`, `devices`, `new_circuit`; fan `action` (replace or new), `vents_outdoors`, `cuts_framing`; `costs.plumbing` (`null`) |
| Must extract | `costs.total: 26000`; `costs.electrical: 3800`; toilet and vanity: `action: replace_same` |
| Follow-ups (more than one round) | Round 1, engine asks `elec.action` (quotes "the usual electrical"), the device count (change 4) and `fan.cuts_framing` (quotes "New fan"). Round 2, once the electrical is confirmed as adding something: whether it's on a new circuit. F120's Devices line is never blank without a note |

## E-05 · "Opening up the wall" (kitchen)

**What it tests:** the AI must not assume a wall is non-bearing. Here `unknown` takes the conservative rule (KB-21).

> Kitchen at 17 Mountain Ave. Opening up the wall between the kitchen and living room to make it one big space. New cabinets, counters and hardwood. $55k.

| | |
|---|---|
| Must stay `unknown` | wall `bearing` |
| Must extract | wall: `kind: wall_change`, `action: remove`; `costs.total: 55000` |

## E-06 · A relative does the wiring

**What it tests:** someone who isn't the owner or a known sub. The AI must not mark the owner as doing the electrical, and must not pick a sub.

> Finish the basement at 6 Lenox Pl: rec room, drywall, carpet, drop ceiling. The homeowner's brother-in-law is an electrician and will handle the wiring.

| | |
|---|---|
| Must be flagged | "the homeowner's brother-in-law" returned as the named person for electrical (plain code finds no match, so the contractor picks) |
| Must stay `unknown` | electrical `action`, `devices`, `new_circuit`; all costs (`null`) |
| Must not | set `performed_by.electrical: owner` |

## E-07 · Owner doing plumbing on a rental

**What it tests:** the description states both who does the work and that the owner doesn't live there. Both must be extracted, not left for a question.

> Bath remodel at 22 Hilton Ave. We're doing the tile, drywall and vanity cabinet. The owner is doing the plumbing themselves: new toilet and sink in the same spots. It's a rental they own, they live in Millburn.

| | |
|---|---|
| Must extract | `performed_by.plumbing: owner`; `owner_occupied: no`; toilet and sink: `action: replace_same` |
| Must stay `unknown` | all costs (`null`) |

## E-08 · Bigger furnace

**What it tests:** "bigger" is stated, the fuel isn't. Most furnaces in Maplewood are gas, but that's a guess.

> Replace the furnace at 3 Plymouth Ave with a bigger unit since they finished the attic. Same spot in the basement. Clearair is doing it, $7,200.

| | |
|---|---|
| Must extract | furnace: `action: replace`, `like_capacity: no`, `same_location: yes`; `costs.total: 7200` |
| Must stay `unknown` | furnace `fuel`, `fuel_change` |
| Must be flagged | "Clearair" returned as the named HVACR sub (plain code matches it to the directory) |

## E-09 · "Maybe a bedroom later" (basement)

**What it tests:** a possible future use isn't this job's facts.

> Finish the basement at 14 Hickory Dr. Open rec room for now, maybe a bedroom down the road. Framing, drywall, two new outlets on the existing circuit.

| | |
|---|---|
| Must stay `unknown` | habitable space `bedroom`; `fuel_appliance_nearby`; all costs (`null`) |
| Must extract | electrical: `action: add`, `devices: 2`, `new_circuit: none` |

## E-10 · "Just a swap, no permit"

**What it tests:** the customer's opinion about the permit must not leak into the facts. "Just a swap" doesn't say same capacity or same fuel.

> Water heater at 50 Ridgewood Rd died. Customer says it's just a swap so no permit needed, put whatever you need on the paperwork. $2,400.

| | |
|---|---|
| Must extract | water heater: `action: replace`; `costs.total: 2400` |
| Must stay `unknown` | `like_capacity`, `fuel`, `fuel_change` |

---

## Coverage

| Likely mistake | Descriptions |
|---|---|
| Guessing a fact from a vague word | E-01, E-04, E-08, E-09, E-10 |
| Assuming the safe-sounding answer | E-05 (bearing wall), E-10 (like-for-like), E-03 ("single family" as detached) |
| Forcing out-of-scope work into a kind | E-02 |
| Turning a cost range into a number | E-03 |
| Who does the work | E-06 (unknown person), E-07 (owner on a rental), E-08 (named sub) |
| Missing a stated fact (shows up as an unnecessary question) | E-02, E-07, E-08, E-09 |
