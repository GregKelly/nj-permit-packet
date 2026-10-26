# M3 eval report

*Generated 2026-10-26 by `npm run eval -- --runs 3 --record`. 3 run(s) per model. Test jobs: 13; eval-only descriptions: 10. *

Targets are from the approved [M3 plan](../plans/m3-plan.md) ("Evals and targets"). Scores are the worst over all runs, except missed facts, which are an average.

| Target | claude-haiku-5-5 | claude-sonnet-5-5 | claude-opus-5-5 |
|---|---|---|---|
| **Guessed facts: zero, every run** | ❌ 1 | ✅ 0 | ❌ 1 |
| Wrong facts: zero | ❌ 3 | ❌ 3 | ✅ 0 |
| Missed facts: at most 1 per job on average | ✅ 0.14 | ✅ 0.20 | ✅ 0.12 |
| Same questions: every job, every run | ❌ 34/39 | ❌ 37/39 | ❌ 36/39 |
| Same result: every job, every run | ❌ 29/39 | ❌ 36/39 | ✅ 39/39 |
| Costs extracted exactly: every job | ❌ 35/39 | ✅ 39/39 | ✅ 39/39 |
| Flags, names, not-covered work: every eval-only case | ❌ 24/30 | ✅ 30/30 | ✅ 30/30 |
| Follow-ups quote the description (E-01, E-03, E-04) | ❌ 4/9 | ✅ 9/9 | ❌ 8/9 |
| Question checks pass: every run | ❌ 59/69 | ✅ 69/69 | ✅ 69/69 |
| Scope checks pass: every run | ✅ 23/23 | ✅ 27/27 | ✅ 27/27 |
| Answers that failed outright (no usable answer) | ❌ 12 | ✅ 0 | ✅ 0 |
| Cost per job, all three calls (average) | $0.003 | $0.022 | $0.043 |
| Cost of this eval | $0.220 | $1.50 | $2.96 |

## Failures

**J-02** · claude-haiku-5-5 · run 1

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Wrong `toilet.fixtures`: expected {"lavatory":1,"water_closet":1}, got {"lavatory":1}
- Missed `toilet.upsizing_needed`: expected "no", got "unknown"
- extra item toilet (fixture: Replace toilet in the same spot)
- extra item shower_valve (faucet_valve: Swap shower valve, same location)

**J-08** · claude-haiku-5-5 · run 1

> Swap out the 20-year-old gas furnace and AC condenser at 66 Parker Ave for same-size units: 80k BTU furnace, 3-ton AC. Condenser goes back on the same pad. New thermostat. Northside is doing it. $14,500.

- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Electrical":500,"Plumbing":14000},"total_cost":14500},"F120":{"use_group":"R-5","est_cost":500,"lines":[{"line":"KW Central AC Unit","count":1,"size":null},{"line":"HP/KW Furnace","count":1,"size":null}]},"F145":{"use_group":"R-5","est_cost":14000,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}, got {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Electrical":500,"Plumbing":14000},"total_cost":14500},"F120":{"use_group":"R-5","est_cost":500,"lines":[{"line":"KW Central AC Unit","count":1,"size":"3-ton"},{"line":"HP/KW Furnace","count":1,"size":"80k BTU"}]},"F145":{"use_group":"R-5","est_cost":14000,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}
- Result: fill_ins: expected [{"form":"F120","signer":"Watts Electric LLC","details":["KW Central AC Unit size","HP/KW Furnace size"]}], got []

**J-10** · claude-haiku-5-5 · run 1

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Error: Work item "range" (appliance) is missing appliance; give a value or "unknown".
- Questions asked: none; approved: hood.cfm_increase
- Question wording: No usable extraction.

**J-13** · claude-haiku-5-5 · run 1

> Taking out the non-bearing wall between kitchen and dining room at 41 Burnet Ave (left half of a twin) and redoing the drywall in both rooms, $16k. The owners live there. While we're at it they want to swap the old gas furnace and the AC condenser themselves, same size (80k BTU, 3-ton), condenser back on the same pad, and do the wiring for them too. They figure $6,500 for the equipment and $200 for the wiring.

- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Building":16000,"Electrical":200,"Plumbing":6500},"total_cost":22700,"owner_section":["C","C.3","D"]},"F110":{"use_group":"R-5","type_of_work":["Rehabilitation"],"rehabilitation_cost":16000,"total_cost":16000},"F120":{"use_group":"R-5","est_cost":200,"exempt_applicant":{"license":"Exempt: homeowner, N.J.S.A. 45:5A-18(n)","hic":"Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii","hic_short":["Exempt: owner, 5:23-2.15(b)8.ii","Exempt: owner"]},"lines":[{"line":"KW Central AC Unit","count":1,"size":null},{"line":"HP/KW Furnace","count":1,"size":null}]},"F145":{"use_group":"R-5","est_cost":6500,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}, got {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Building":16000,"Electrical":200,"Plumbing":6500},"total_cost":22700,"owner_section":["C","C.3","D"]},"F110":{"use_group":"R-5","type_of_work":["Rehabilitation"],"rehabilitation_cost":16000,"total_cost":16000},"F120":{"use_group":"R-5","est_cost":200,"exempt_applicant":{"license":"Exempt: homeowner, N.J.S.A. 45:5A-18(n)","hic":"Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii","hic_short":["Exempt: owner, 5:23-2.15(b)8.ii","Exempt: owner"]},"lines":[{"line":"KW Central AC Unit","count":1,"size":"3-ton"},{"line":"HP/KW Furnace","count":1,"size":"80k BTU"}]},"F145":{"use_group":"R-5","est_cost":6500,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}
- Result: fill_ins: expected [{"form":"F120","signer":"Owner","details":["KW Central AC Unit size","HP/KW Furnace size"]}], got []

**J-01** · claude-haiku-5-5 · run 2

> Full kitchen gut at 34 Oakview Ave for the Morenos. Taking down the wall between the kitchen and dining room. It's not load bearing, I checked from the basement, joists run parallel to it. New cabinets, quartz counters, LVP floor, new drywall throughout. Moving the sink to the new island and adding a dishwasher and disposal there. Electrical: two new 20A counter circuits, 8 recessed cans, island outlets, about 18 devices total. Range stays where it is, same gas hookup. Contract is $48,000: plumbing about $3,500, electrical about $5,500.

- Error: Work item "range" (appliance) is missing appliance; give a value or "unknown".
- Questions asked: none; approved: none
- Question wording: No usable extraction.

**J-02** · claude-haiku-5-5 · run 2

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Wrong `toilet.fixtures`: expected {"lavatory":1,"water_closet":1}, got {"water_closet":1}
- Missed `toilet.upsizing_needed`: expected "no", got "unknown"
- extra item vanity_sink (fixture: Vanity sink, replaced with the vanity)
- extra item shower_valve (faucet_valve: Swap the shower valve, same location)

**J-08** · claude-haiku-5-5 · run 2

> Swap out the 20-year-old gas furnace and AC condenser at 66 Parker Ave for same-size units: 80k BTU furnace, 3-ton AC. Condenser goes back on the same pad. New thermostat. Northside is doing it. $14,500.

- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Electrical":500,"Plumbing":14000},"total_cost":14500},"F120":{"use_group":"R-5","est_cost":500,"lines":[{"line":"KW Central AC Unit","count":1,"size":null},{"line":"HP/KW Furnace","count":1,"size":null}]},"F145":{"use_group":"R-5","est_cost":14000,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}, got {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Electrical":500,"Plumbing":14000},"total_cost":14500},"F120":{"use_group":"R-5","est_cost":500,"lines":[{"line":"KW Central AC Unit","count":1,"size":"3-ton"},{"line":"HP/KW Furnace","count":1,"size":"80k BTU"}]},"F145":{"use_group":"R-5","est_cost":14000,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}
- Result: fill_ins: expected [{"form":"F120","signer":"Watts Electric LLC","details":["KW Central AC Unit size","HP/KW Furnace size"]}], got []

**J-10** · claude-haiku-5-5 · run 2

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"
- extra item hood_ductwork (ductwork: Hood ducting outside through back wall)
- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Alteration","cost_by_subcode":{"Electrical":600,"Plumbing":3000},"total_cost":3600},"F120":{"use_group":"R-5","est_cost":600,"lines":[{"line":"Devices","count":1}]},"F130":{"use_group":"R-5","est_cost":1200,"lines":[{"line":"Gas piping","count":1}]},"F145":{"use_group":"R-5","est_cost":1800,"heating_system":null,"lines":[{"line":"Other","count":1}]}}, got {"F100":{"use_group":"R-5","proposed_work":"Alteration","cost_by_subcode":{"Electrical":600,"Plumbing":3000},"total_cost":3600},"F120":{"use_group":"R-5","est_cost":600,"lines":[{"line":"Devices","count":1}]},"F130":{"use_group":"R-5","est_cost":1200,"lines":[{"line":"Gas piping","count":1}]},"F145":{"use_group":"R-5","est_cost":1800,"heating_system":{"work":"Modification","distribution":"Hot Air","fuel":null},"lines":[{"line":"Other","count":1},{"line":"Other","count":1}]}}
- Result: fill_ins: expected [], got [{"form":"F145","signer":"Clearair Mechanical","details":["Heating system fuel"]}]

**J-13** · claude-haiku-5-5 · run 2

> Taking out the non-bearing wall between kitchen and dining room at 41 Burnet Ave (left half of a twin) and redoing the drywall in both rooms, $16k. The owners live there. While we're at it they want to swap the old gas furnace and the AC condenser themselves, same size (80k BTU, 3-ton), condenser back on the same pad, and do the wiring for them too. They figure $6,500 for the equipment and $200 for the wiring.

- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Building":16000,"Electrical":200,"Plumbing":6500},"total_cost":22700,"owner_section":["C","C.3","D"]},"F110":{"use_group":"R-5","type_of_work":["Rehabilitation"],"rehabilitation_cost":16000,"total_cost":16000},"F120":{"use_group":"R-5","est_cost":200,"exempt_applicant":{"license":"Exempt: homeowner, N.J.S.A. 45:5A-18(n)","hic":"Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii","hic_short":["Exempt: owner, 5:23-2.15(b)8.ii","Exempt: owner"]},"lines":[{"line":"KW Central AC Unit","count":1,"size":null},{"line":"HP/KW Furnace","count":1,"size":null}]},"F145":{"use_group":"R-5","est_cost":6500,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}, got {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Building":16000,"Electrical":200,"Plumbing":6500},"total_cost":22700,"owner_section":["C","C.3","D"]},"F110":{"use_group":"R-5","type_of_work":["Rehabilitation"],"rehabilitation_cost":16000,"total_cost":16000},"F120":{"use_group":"R-5","est_cost":200,"exempt_applicant":{"license":"Exempt: homeowner, N.J.S.A. 45:5A-18(n)","hic":"Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii","hic_short":["Exempt: owner, 5:23-2.15(b)8.ii","Exempt: owner"]},"lines":[{"line":"KW Central AC Unit","count":1,"size":"3-ton"},{"line":"HP/KW Furnace","count":1,"size":"80k BTU"}]},"F145":{"use_group":"R-5","est_cost":6500,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}
- Result: fill_ins: expected [{"form":"F120","signer":"Owner","details":["KW Central AC Unit size","HP/KW Furnace size"]}], got []

**J-01** · claude-haiku-5-5 · run 3

> Full kitchen gut at 34 Oakview Ave for the Morenos. Taking down the wall between the kitchen and dining room. It's not load bearing, I checked from the basement, joists run parallel to it. New cabinets, quartz counters, LVP floor, new drywall throughout. Moving the sink to the new island and adding a dishwasher and disposal there. Electrical: two new 20A counter circuits, 8 recessed cans, island outlets, about 18 devices total. Range stays where it is, same gas hookup. Contract is $48,000: plumbing about $3,500, electrical about $5,500.

- Error: Work item "cabinets" (finishes) has no fact "material"; finishes facts are: element. Work item "countertops" (finishes) has no fact "material"; finishes facts are: element. Work item "flooring" (finishes) has no fact "material"; finishes facts are: element.
- Questions asked: none; approved: none
- Question wording: No usable extraction.

**J-02** · claude-haiku-5-5 · run 3

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Wrong `toilet.fixtures`: expected {"lavatory":1,"water_closet":1}, got {"lavatory":1}
- Missed `toilet.upsizing_needed`: expected "no", got "unknown"
- extra item toilet (fixture: Replace toilet in same spot, same plumbing)
- extra item shower_valve (faucet_valve: Swap shower valve, same location)

**J-08** · claude-haiku-5-5 · run 3

> Swap out the 20-year-old gas furnace and AC condenser at 66 Parker Ave for same-size units: 80k BTU furnace, 3-ton AC. Condenser goes back on the same pad. New thermostat. Northside is doing it. $14,500.

- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Electrical":500,"Plumbing":14000},"total_cost":14500},"F120":{"use_group":"R-5","est_cost":500,"lines":[{"line":"KW Central AC Unit","count":1,"size":null},{"line":"HP/KW Furnace","count":1,"size":null}]},"F145":{"use_group":"R-5","est_cost":14000,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}, got {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Electrical":500,"Plumbing":14000},"total_cost":14500},"F120":{"use_group":"R-5","est_cost":500,"lines":[{"line":"KW Central AC Unit","count":1,"size":"3-ton"},{"line":"HP/KW Furnace","count":1,"size":"80k BTU"}]},"F145":{"use_group":"R-5","est_cost":14000,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}
- Result: fill_ins: expected [{"form":"F120","signer":"Watts Electric LLC","details":["KW Central AC Unit size","HP/KW Furnace size"]}], got []

**J-10** · claude-haiku-5-5 · run 3

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Error: Work item "countertops" (finishes) has no fact "material"; finishes facts are: element. Work item "backsplash" (finishes) has no fact "material"; finishes facts are: element.
- Questions asked: none; approved: hood.cfm_increase
- Question wording: No usable extraction.

**J-13** · claude-haiku-5-5 · run 3

> Taking out the non-bearing wall between kitchen and dining room at 41 Burnet Ave (left half of a twin) and redoing the drywall in both rooms, $16k. The owners live there. While we're at it they want to swap the old gas furnace and the AC condenser themselves, same size (80k BTU, 3-ton), condenser back on the same pad, and do the wiring for them too. They figure $6,500 for the equipment and $200 for the wiring.

- Missed `furnace.fuel_change`: expected "no", got "unknown"
- Questions asked: costs.plumbing, furnace.fuel_change; approved: none

**E-01** · claude-haiku-5-5 · run 1

> Hall bath at 12 Courter Ave. New toilet and vanity in the same spots, new tile floor, and a new window over the tub. $11,000.

- Error: Work item "toilet" (fixture) has no fact "same_location"; fixture facts are: fixtures, action, upsizing_needed.
- No usable extraction.
- No usable extraction.
- Question wording: No usable extraction.

**E-04** · claude-haiku-5-5 · run 1

> Full gut of the upstairs bath at 45 Jefferson Ave. Tub stays, new toilet and vanity in the same places, new tile. New fan, and the usual electrical. Total is $26k, electrician quoted $3,800.

- Missed `fixtures.action`: expected "replace_same", got "unknown"

**E-06** · claude-haiku-5-5 · run 1

> Finish the basement at 6 Lenox Pl: rec room, drywall, carpet, drop ceiling. The homeowner's brother-in-law is an electrician and will handle the wiring.

- Error: Work item "wiring" (electrical): equipment "unknown" isn't allowed; use one of: none, radiant_floor_heat, other.
- No usable extraction.
- Question wording: No usable extraction.

**E-08** · claude-haiku-5-5 · run 1

> Replace the furnace at 3 Plymouth Ave with a bigger unit since they finished the attic. Same spot in the basement. Clearair is doing it, $7,200.

- Missed `costs.total`: expected 7200, got null

**E-01** · claude-haiku-5-5 · run 2

> Hall bath at 12 Courter Ave. New toilet and vanity in the same spots, new tile floor, and a new window over the tub. $11,000.

- Error: Work item "toilet" (fixture) has no fact "same_location"; fixture facts are: fixtures, action, upsizing_needed.
- No usable extraction.
- No usable extraction.
- Question wording: No usable extraction.

**E-02** · claude-haiku-5-5 · run 2

> Kitchen at 30 Valley St: new cabinets and counters, and replace the back door with a slider in a wider opening. They also want a 12x16 deck off the new slider.

- Error: Work item "back_door_slider" (opening): opening "exterior door" isn't allowed; use one of: window, exterior_door, interior_door.
- No usable extraction.
- Question wording: No usable extraction.

**E-04** · claude-haiku-5-5 · run 2

> Full gut of the upstairs bath at 45 Jefferson Ave. Tub stays, new toilet and vanity in the same places, new tile. New fan, and the usual electrical. Total is $26k, electrician quoted $3,800.

- Error: Work item "usual_electrical" (electrical): equipment "unknown" isn't allowed; use one of: none, radiant_floor_heat, other.
- No usable extraction.
- No usable extraction.
- Question wording: No usable extraction.

**E-08** · claude-haiku-5-5 · run 2

> Replace the furnace at 3 Plymouth Ave with a bigger unit since they finished the attic. Same spot in the basement. Clearair is doing it, $7,200.

- Missed `costs.total`: expected 7200, got null

**E-03** · claude-haiku-5-5 · run 3

> Tear off and reroof 8 Baker St, single family, one layer on there now. Architectural shingles, new drip edge. Somewhere around $14–16k depending on what we find under it.

- Error: Work item "reroof" (roof_covering) has no fact "material"; roof_covering facts are: existing_layers.
- No usable extraction.
- No usable extraction.
- Question wording: No usable extraction.

**E-04** · claude-haiku-5-5 · run 3

> Full gut of the upstairs bath at 45 Jefferson Ave. Tub stays, new toilet and vanity in the same places, new tile. New fan, and the usual electrical. Total is $26k, electrician quoted $3,800.

- Error: Checks failed after retry: The quote key bath_walls.material is for a fact you gave a value; quotes are only for unknown facts and null costs. The quote key tile.element is for a fact you gave a value; quotes are only for unknown facts and null costs. The quote key usual_electrical.action is for a fact you gave a value; quotes are only for unknown facts and null costs. The quote key usual_electrical.equipment is for a fact you gave a value; quotes are only for unknown facts and null costs.
- Guessed `electrical.action`: expected "unknown", got "add"
- Missed `fixtures.action`: expected "replace_same", got "unknown"
- The engine didn't ask about {"kind":"electrical"}.action.

**E-08** · claude-haiku-5-5 · run 3

> Replace the furnace at 3 Plymouth Ave with a bigger unit since they finished the attic. Same spot in the basement. Clearair is doing it, $7,200.

- Missed `costs.total`: expected 7200, got null

**E-09** · claude-haiku-5-5 · run 3

> Finish the basement at 14 Hickory Dr. Open rec room for now, maybe a bedroom down the road. Framing, drywall, two new outlets on the existing circuit.

- Error: Checks failed after retry: The quote key habitable_space.bedroom doesn't name a fact in your answer.

**J-02** · claude-sonnet-5-5 · run 1

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Wrong `toilet.fixtures`: expected {"lavatory":1,"water_closet":1}, got {"water_closet":1}
- Missed `toilet.upsizing_needed`: expected "no", got "unknown"
- extra item shower_valve (faucet_valve: Swap the shower valve, same location)

**J-09** · claude-sonnet-5-5 · run 1

> Install a 3-zone ductless mini-split at 15 Midland Blvd, cooling only. House has steam radiators, owner is keeping those for heat. Outdoor unit on a new pad in the side yard, line sets run up the outside wall. New 30A circuit for the condenser. Clearair is installing. $16k.

- Missed `minisplit.fuel_change`: expected "no", got "unknown"
- Missed `minisplit.same_location`: expected "no", got "unknown"

**J-10** · claude-sonnet-5-5 · run 1

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"

**J-02** · claude-sonnet-5-5 · run 2

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Wrong `toilet.fixtures`: expected {"lavatory":1,"water_closet":1}, got {"water_closet":1}
- Missed `toilet.upsizing_needed`: expected "no", got "unknown"

**J-09** · claude-sonnet-5-5 · run 2

> Install a 3-zone ductless mini-split at 15 Midland Blvd, cooling only. House has steam radiators, owner is keeping those for heat. Outdoor unit on a new pad in the side yard, line sets run up the outside wall. New 30A circuit for the condenser. Clearair is installing. $16k.

- Missed `minisplit.fuel_change`: expected "no", got "unknown"
- Missed `minisplit.same_location`: expected "no", got "unknown"

**J-10** · claude-sonnet-5-5 · run 2

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"
- extra item electrical_work (electrical: Electrical $600)
- Questions asked: electrical_work.action, electrical_work.devices, hood.cfm_increase; approved: hood.cfm_increase
- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Alteration","cost_by_subcode":{"Electrical":600,"Plumbing":3000},"total_cost":3600},"F120":{"use_group":"R-5","est_cost":600,"lines":[{"line":"Devices","count":1}]},"F130":{"use_group":"R-5","est_cost":1200,"lines":[{"line":"Gas piping","count":1}]},"F145":{"use_group":"R-5","est_cost":1800,"heating_system":null,"lines":[{"line":"Other","count":1}]}}, got {"F100":{"use_group":"R-5","proposed_work":"Alteration","cost_by_subcode":{"Electrical":600,"Plumbing":3000},"total_cost":3600},"F120":{"use_group":"R-5","est_cost":600,"lines":[{"line":"Devices","count":null}]},"F130":{"use_group":"R-5","est_cost":1200,"lines":[{"line":"Gas piping","count":1}]},"F145":{"use_group":"R-5","est_cost":1800,"heating_system":null,"lines":[{"line":"Other","count":1}]}}
- Result: fill_ins: expected [], got [{"form":"F120","signer":"Watts Electric LLC","details":["Devices count"]}]

**J-02** · claude-sonnet-5-5 · run 3

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Wrong `toilet.fixtures`: expected {"lavatory":1,"water_closet":1}, got {"water_closet":1}
- Missed `toilet.upsizing_needed`: expected "no", got "unknown"

**J-09** · claude-sonnet-5-5 · run 3

> Install a 3-zone ductless mini-split at 15 Midland Blvd, cooling only. House has steam radiators, owner is keeping those for heat. Outdoor unit on a new pad in the side yard, line sets run up the outside wall. New 30A circuit for the condenser. Clearair is installing. $16k.

- Missed `minisplit.fuel_change`: expected "no", got "unknown"
- Missed `minisplit.same_location`: expected "no", got "unknown"

**J-10** · claude-sonnet-5-5 · run 3

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"
- extra item electrical_work (electrical: Electrical)
- Questions asked: electrical_work.action, electrical_work.devices, hood.cfm_increase; approved: hood.cfm_increase
- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Alteration","cost_by_subcode":{"Electrical":600,"Plumbing":3000},"total_cost":3600},"F120":{"use_group":"R-5","est_cost":600,"lines":[{"line":"Devices","count":1}]},"F130":{"use_group":"R-5","est_cost":1200,"lines":[{"line":"Gas piping","count":1}]},"F145":{"use_group":"R-5","est_cost":1800,"heating_system":null,"lines":[{"line":"Other","count":1}]}}, got {"F100":{"use_group":"R-5","proposed_work":"Alteration","cost_by_subcode":{"Electrical":600,"Plumbing":3000},"total_cost":3600},"F120":{"use_group":"R-5","est_cost":600,"lines":[{"line":"Devices","count":null}]},"F130":{"use_group":"R-5","est_cost":1200,"lines":[{"line":"Gas piping","count":1}]},"F145":{"use_group":"R-5","est_cost":1800,"heating_system":null,"lines":[{"line":"Other","count":1}]}}
- Result: fill_ins: expected [], got [{"form":"F120","signer":"Watts Electric LLC","details":["Devices count"]}]

**J-13** · claude-sonnet-5-5 · run 3

> Taking out the non-bearing wall between kitchen and dining room at 41 Burnet Ave (left half of a twin) and redoing the drywall in both rooms, $16k. The owners live there. While we're at it they want to swap the old gas furnace and the AC condenser themselves, same size (80k BTU, 3-ton), condenser back on the same pad, and do the wiring for them too. They figure $6,500 for the equipment and $200 for the wiring.

- Result: form_entries: expected {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Building":16000,"Electrical":200,"Plumbing":6500},"total_cost":22700,"owner_section":["C","C.3","D"]},"F110":{"use_group":"R-5","type_of_work":["Rehabilitation"],"rehabilitation_cost":16000,"total_cost":16000},"F120":{"use_group":"R-5","est_cost":200,"exempt_applicant":{"license":"Exempt: homeowner, N.J.S.A. 45:5A-18(n)","hic":"Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii","hic_short":["Exempt: owner, 5:23-2.15(b)8.ii","Exempt: owner"]},"lines":[{"line":"KW Central AC Unit","count":1,"size":null},{"line":"HP/KW Furnace","count":1,"size":null}]},"F145":{"use_group":"R-5","est_cost":6500,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}, got {"F100":{"use_group":"R-5","proposed_work":"Minor Work","cost_by_subcode":{"Building":16000,"Electrical":200,"Plumbing":6500},"total_cost":22700,"owner_section":["C","C.3","D"]},"F110":{"use_group":"R-5","type_of_work":["Rehabilitation"],"rehabilitation_cost":16000,"total_cost":16000},"F120":{"use_group":"R-5","est_cost":200,"exempt_applicant":{"license":"Exempt: homeowner, N.J.S.A. 45:5A-18(n)","hic":"Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii","hic_short":["Exempt: owner, 5:23-2.15(b)8.ii","Exempt: owner"]},"lines":[{"line":"KW Central AC Unit","count":1,"size":"3-ton"},{"line":"HP/KW Furnace","count":1,"size":"80k BTU"}]},"F145":{"use_group":"R-5","est_cost":6500,"heating_system":{"work":"Replacement","distribution":"Hot Air","fuel":"Gas"},"lines":[{"line":"Hot Air Furnace","count":1},{"line":"Other","count":1}]},"F370":{"use_group":"R-5"}}
- Result: fill_ins: expected [{"form":"F120","signer":"Owner","details":["KW Central AC Unit size","HP/KW Furnace size"]}], got []

**E-04** · claude-sonnet-5-5 · run 1

> Full gut of the upstairs bath at 45 Jefferson Ave. Tub stays, new toilet and vanity in the same places, new tile. New fan, and the usual electrical. Total is $26k, electrician quoted $3,800.

- Missed `fixtures.action`: expected "replace_same", got "unknown"

**E-04** · claude-sonnet-5-5 · run 3

> Full gut of the upstairs bath at 45 Jefferson Ave. Tub stays, new toilet and vanity in the same places, new tile. New fan, and the usual electrical. Total is $26k, electrician quoted $3,800.

- Missed `fixtures.action`: expected "replace_same", got "unknown"

**J-02** · claude-opus-5-5 · run 1

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Missed `toilet.upsizing_needed`: expected "no", got "unknown"
- Missed `fan.vents_outdoors`: expected "yes", got "unknown"
- extra item shower_valve (faucet_valve: Swap the shower valve, same location)
- Questions asked: costs.electrical, fan.cuts_framing, fan.vents_outdoors; approved: none

**J-03** · claude-opus-5-5 · run 1

> Redo the primary bath at 7 Tuscan Rd. Rip out the tub, put in a walk-in tile shower. Double vanity instead of the single. Heated floor. Owner wants a bigger window over the tub area. Budget $32k.

- extra item bath_floor (finishes: Floor over the heated floor)

**J-10** · claude-opus-5-5 · run 1

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Guessed `hood.cfm_increase`: expected "unknown", got "yes"
- Missed `range.fuel_change`: expected "no", got "unknown"
- Questions asked: none; approved: hood.cfm_increase

**J-02** · claude-opus-5-5 · run 2

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Missed `toilet.upsizing_needed`: expected "no", got "unknown"
- extra item shower_valve (faucet_valve: Swap the shower valve, same location)

**J-10** · claude-opus-5-5 · run 2

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"

**J-02** · claude-opus-5-5 · run 3

> Hall bath refresh at 18 Elmwood Ave. Replace the vanity and toilet in the same spots, same plumbing. New porcelain tile floor. New faucet and swap the shower valve, same location. Replace the vanity light and the exhaust fan (existing fan already vents outside). Paint. About $14,000.

- Missed `toilet.upsizing_needed`: expected "no", got "unknown"

**J-03** · claude-opus-5-5 · run 3

> Redo the primary bath at 7 Tuscan Rd. Rip out the tub, put in a walk-in tile shower. Double vanity instead of the single. Heated floor. Owner wants a bigger window over the tub area. Budget $32k.

- Missed `heated_floor.action`: expected "add", got "unknown"
- extra item flooring (finishes: Floor over the heated floor)
- Questions asked: costs.electrical, costs.plumbing, heated_floor.action, heated_floor.new_circuit, lavs.upsizing_needed, shower.action; approved: shower.action, lavs.upsizing_needed, heated_floor.new_circuit, costs.plumbing, costs.electrical

**J-10** · claude-opus-5-5 · run 3

> Kitchen refresh at 27 Prospect St. Paint the existing cabinets, new quartz counters and backsplash. Swapping the 30" range for a 36" pro gas range in the same spot, which needs a bigger gas line from the meter. Replacing the old recirculating hood with a 900 cfm hood ducted outside through the back wall. Total $21,000: gas line $1,200, electrical $600, hood and ductwork $1,800.

- Missed `range.fuel_change`: expected "no", got "unknown"

**E-03** · claude-opus-5-5 · run 3

> Tear off and reroof 8 Baker St, single family, one layer on there now. Architectural shingles, new drip edge. Somewhere around $14–16k depending on what we find under it.

- The question for property.dwelling_type doesn't refer to "single family": "You mentioned it's a single-family home. Is it a detached house, or does it share a wall with another home (like a twin or townhouse)?"


## Sample follow-up questions (run 1)

### claude-haiku-5-5

**J-03**

- You mentioned you'd put in a walk-in tile shower. Is the shower replacing the tub in the same spot with the same piping, is it an extra fixture where there wasn't one with piping in the existing space, or is it moving to a different spot with the drain or supply lines rerouted? *(Replaces the old tub in the same spot, same piping / New fixture where there wasn't one, piping in the existing space / Moves to a different spot, drain or supply lines rerouted / Don't know)*
- For the double vanity instead of the single, does the work need bigger water lines or a bigger drain? *(Yes / No / Don't know)*
- You mentioned a heated floor. Does the work need a new circuit from the panel, and if so, what is it for? *(No new circuit, it runs on existing circuits / New circuit only for a range, oven, dryer or air conditioner / Another new circuit (e.g. counter outlets, lights, a heated floor) / Don't know)*
- The application needs a single estimated electrical cost; an estimate is fine. What dollar figure should go on it? *(number)*
- The application needs a single estimated plumbing cost; an estimate is fine. What dollar figure should go on it? *(number)*

**J-04**

- For the family room and home office, will any of these finished rooms be used as a bedroom? *(Yes / No / Don't know)*
- For the family room and home office, is a furnace, boiler or water heater located in one of these rooms or right next to them? *(Yes / No / Don't know)*

**J-05**

- You mentioned turning the back half of the basement into a guest bedroom. Is a furnace, boiler or water heater in those finished rooms or right next to them? *(Yes / No / Don't know)*
- You mentioned smoke and CO alarms for the new bedroom. How are those alarms powered? *(Hardwired to the house wiring / Battery only / Plug-in / Don't know)*

**J-06**

- You mentioned you'll tear off and replace the roof. How many layers of roofing are on the roof now? *(One layer / Two or more layers / Don't know)*
- You mentioned replacing a few sheets of rotted plywood. Will any rafters, joists or other roof framing be repaired or replaced? *(Yes / No / Don't know)*

**J-07**

- You mentioned reroofing the left half of the twin. How many layers of roofing are on that roof now? *(One layer / Two or more layers / Don't know)*

**J-08**

- What is the estimated cost of the electrical work, in dollars? The application needs a single estimated dollar amount, and an estimate is fine. *(number)*

**J-09**

- What is the estimated cost of the electrical work, in dollars? The application needs a single estimated amount, and an estimate is fine. *(number)*

**J-11**

- Does the owner live in the home? *(Yes, the owner lives there / No, the owner doesn't, but their immediate family does / No, neither the owner nor their immediate family lives there (e.g. a rental) / Don't know)*

**J-12**

- You mentioned a rec room. Will any finished room in it be used as a bedroom? *(Yes / No / Don't know)*
- Is a furnace, boiler or water heater located in the rec room or right next to it? *(Yes / No / Don't know)*
- For the half bath (toilet and sink, gravity drain), do the water lines or the drain need to be made bigger for the new bathroom? *(Yes / No / Don't know)*
- What is the estimated cost of the electrical work in dollars? The application needs a single estimated dollar amount, and an estimate is fine. *(number)*
- What is the estimated cost of the plumbing work in dollars? The application needs a single estimated dollar amount, and an estimate is fine. *(number)*

**E-03**

- You mentioned this is a single family home. Which best describes the building: a detached single-family house, a two-family house with two households, an attached home that shares a wall (twin, townhouse, or row house), a building with three or more homes, or something that is not a home? *(Detached single-family house / Two-family house (two households) / Attached single-family home that shares a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned somewhere around $14–16k, depending on what we find under it. The application needs a single estimated cost; an estimate is fine. What figure should go on it? *(number)*

**E-04**

- What kind of home is this? It's about how many households live in it and whether it shares a wall with another home, not the number of stories. *(Detached single-family house / Two-family house (two households) / Attached single-family home that shares a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned the tub stays. Is the new tub going in the same spot as the old one, is it an extra fixture where there wasn't one before, or is it moving to a different spot where the drain or supply lines get rerouted? *(Replaces the old one in the same spot, same piping / Extra fixture where there wasn't one, piping in the existing space / Moves to a different spot (drain or supply lines rerouted) / Don't know)*
- You mentioned a new fan. Will installing the fan or its duct mean cutting joists, studs or rafters? *(Yes / No / Don't know)*
- You mentioned the usual electrical work. Does it only replace existing outlets, switches or lights like-for-like, or does it add new outlets, switches, lights or circuits? *(Only replaces existing ones like-for-like / Adds new outlets, switches, lights or circuits / Don't know)*
- You mentioned the usual electrical work. How many outlets, switches and light fixtures does the electrical work install in total? *(number)*
- The application needs a single estimated dollar amount for the plumbing work; an estimate is fine. What figure should go on it? *(number)*

### claude-sonnet-5-5

**J-03**

- You mentioned ripping out the tub and putting in a walk-in tile shower. Does the shower go in the same spot with the same piping, is it an extra fixture added using the existing piping space, or does it move so the drain or supply lines are rerouted? *(Same spot, same piping / Extra fixture, piping in existing space / Moved, drain or supply lines rerouted / Don't know)*
- For the double vanity instead of the single, do the water lines or the drain have to be made bigger? *(Yes, water lines or drain made bigger / No, not made bigger / Don't know)*
- You mentioned a heated floor. Does the work need a new circuit from the panel, and if so, what is it for? *(No new circuit, uses existing circuits / New circuit only for a range, oven, dryer or air conditioner / Other new circuit (e.g. counter outlets, lights, heated floor) / Don't know)*
- The application needs a single estimated dollar amount for the electrical work; an estimate is fine. What figure should go on it? *(number)*
- The application needs a single estimated dollar amount for the plumbing work; an estimate is fine. What figure should go on it? *(number)*

**J-04**

- You mentioned a family room and home office in the basement. Will any of the finished rooms be used as a bedroom? *(Yes, a room will be used as a bedroom / No, none will be used as a bedroom / Don't know)*
- For the basement finish, is a furnace, boiler or water heater in or right next to the finished rooms? *(Yes, one is in or right next to the finished rooms / No, none is in or right next to the finished rooms / Don't know)*

**J-05**

- For turning the back half of the basement into a guest bedroom, is a furnace, boiler or water heater in or right next to the finished rooms? *(Yes, one is in or right next to the rooms / No, none is in or next to the rooms / Don't know)*
- For the smoke and CO alarms in the new bedroom, how are they powered? *(Hardwired to the house wiring / Battery only / Plug-in / Don't know)*

**J-06**

- You mentioned tearing off and replacing the roof. How many layers of roofing are on the roof now? *(One layer / Two or more layers / Don't know)*
- You mentioned replacing a few sheets of rotted plywood. Are any rafters, joists or other roof framing being repaired or replaced as well? *(Yes, framing is repaired or replaced / No, no framing work / Don't know)*

**J-07**

- For the reroof on the left half of the twin, how many layers of roofing are on the roof now? *(One layer / Two or more layers / Don't know)*

**J-08**

- The application needs a single estimated dollar amount for the electrical work, and an estimate is fine. What figure should go on it? *(number)*

**J-09**

- The application needs a single estimated dollar amount for the electrical work, and an estimate is fine. What figure should go on it? *(number)*

**J-10**

- You mentioned replacing the old recirculating hood with a 900 cfm hood. Is the new hood more powerful (higher cfm) than the old one? *(Yes, the new hood has a higher cfm / No, the new hood does not have a higher cfm / Don't know)*

**J-11**

- Does the owner live in the home, or does someone else live there? *(Yes, the owner lives there / No, but the owner's immediate family lives there / Neither, such as a rental / Don't know)*

**J-12**

- You mentioned a "Rec room" in the basement. Will any of the finished rooms there be used as a bedroom? *(Yes, a bedroom / No bedroom / Don't know)*
- Is a furnace, boiler or water heater in or right next to the finished basement rooms? *(Yes, one is in or next to the rooms / No, none in or next to the rooms / Don't know)*
- For the new half bath, do the water lines or the drain have to be made bigger? *(Yes, water lines or drain must be made bigger / No, existing sizes are fine / Don't know)*
- The application needs a single estimated dollar amount for the electrical work; an estimate is fine. What figure should go on it? *(number)*
- The application needs a single estimated dollar amount for the plumbing work; an estimate is fine. What figure should go on it? *(number)*

**E-01**

- What kind of home is this property? (Think about how many households it has and whether it shares a wall, not how many stories.) *(Detached single-family house / Two-family house (two households) / Attached single-family home sharing a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned a new window over the tub. Is the opening new, is an existing opening being made bigger, or is the window being replaced in the same opening, unchanged? *(Same opening, unchanged / New opening / Existing opening made bigger / Don't know)*

**E-03**

- You mentioned this is a single family home. Which of these best describes the property? *(Detached single-family house / Two-family house (two households) / Attached single-family home sharing a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned somewhere around $14–16k, depending on what you find under it. The application needs a single estimated cost; an estimate is fine. What figure should go on it? *(number)*

**E-04**

- What kind of home is this: a detached single-family house, a two-family house, an attached single-family home that shares a wall, a building with three or more homes, or something that isn't a home? *(Detached single-family house / Two-family house (two households) / Attached single-family (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned "Tub stays." Is the tub replacing the old one in the same spot with the same piping, an extra fixture added where there wasn't one, or moving to a different spot with the drain or supply lines rerouted? *(Replaces old one, same spot and piping / Extra fixture added, piping in existing space / Moves to a different spot, lines rerouted / Don't know)*
- You mentioned a new fan. Does installing the fan or its duct mean cutting any joists, studs or rafters? *(Yes, framing gets cut / No, no framing cut / Don't know)*
- You mentioned "the usual electrical." Does it only replace existing outlets, switches or lights like-for-like, or does it add new ones? *(Only replaces existing like-for-like / Adds new outlets, switches, lights or circuits / Don't know)*
- You mentioned "the usual electrical." How many outlets, switches and light fixtures does the electrical work install in total? *(number)*
- The application needs a single estimated dollar amount for the plumbing work, and an estimate is fine. What figure should go on it? *(number)*

### claude-opus-5-5

**J-02**

- You mentioned the existing fan already vents outside. Will the new exhaust fan vent directly to the outdoors? *(Yes, vents directly outdoors / No, does not vent directly outdoors / Don't know)*
- You mentioned replacing the exhaust fan. Does installing the new fan or its duct require cutting any joists, studs or rafters? *(Yes, framing gets cut / No framing gets cut / Don't know)*
- The application needs a single estimated dollar amount for the electrical work; an estimate is fine. What figure should go on it? *(number)*

**J-03**

- You mentioned ripping out the tub and putting in a walk-in tile shower. Will the shower sit where the tub was on the same piping, be an extra fixture where there wasn't one, or move to a different spot with the drain or supply lines rerouted? *(Same spot as the tub, same piping / Extra fixture where there wasn't one / Different spot, drain or supply lines rerouted / Don't know)*
- You mentioned a double vanity instead of the single. Do the water lines or the drain need to be made bigger for it? *(Yes, lines or drain made bigger / No, existing sizes stay / Don't know)*
- You mentioned a heated floor. Does this work need a new circuit from the panel, and if so, what is it for? *(No new circuit, runs on existing circuits / New circuit only for a range, oven, dryer or air conditioner / New circuit for anything else (such as the heated floor) / Don't know)*
- The application needs a single estimated dollar amount for the electrical work; an estimate is fine. What figure should go on it? *(number)*
- The application needs a single estimated dollar amount for the plumbing work; an estimate is fine. What figure should go on it? *(number)*

**J-04**

- You mentioned a family room, home office and full bath. Will any of the finished basement rooms be used as a bedroom? *(Yes, a room will be used as a bedroom / No bedroom / Don't know)*
- Is there a furnace, boiler or water heater inside or right next to any of the finished basement rooms? *(Yes, in or right next to the finished rooms / No, none in or next to the finished rooms / Don't know)*

**J-05**

- For the guest bedroom in the back half of the basement, is there a furnace, boiler or water heater inside the finished rooms or right next to them? *(Yes, one is in or right next to the finished rooms / No / Don't know)*
- How will the smoke and CO alarms in the new bedroom be powered? *(Hardwired to the house wiring / Battery only / Plug-in / Don't know)*

**J-06**

- You mentioned tearing off and replacing the roof. How many layers of roofing are on the roof right now? *(One layer / Two or more layers / Don't know)*
- You mentioned replacing a few sheets of rotted plywood. Will any rafters, joists or other roof framing be repaired or replaced too? *(Yes, some framing is repaired or replaced / No, only the plywood sheets / Don't know)*

**J-07**

- For the reroof on the left half of the twin, how many layers of roofing are on the roof right now? *(One layer / Two or more layers / Don't know)*

**J-08**

- The application needs a single estimated dollar amount for the electrical work; an estimate is fine. What figure should go on it? *(number)*

**J-09**

- The application needs a single estimated dollar amount for the electrical work; an estimate is fine. What figure should go on it? *(number)*

**J-11**

- Does the owner live in the home? *(Yes, the owner lives there / No, but the owner's immediate family lives there / No, neither the owner nor their immediate family lives there (e.g. a rental) / Don't know)*

**J-12**

- You mentioned a rec room plus a half bath. Will any of the finished basement rooms be used as a bedroom? *(Yes, a room will be used as a bedroom / No bedroom / Don't know)*
- Is there a furnace, boiler or water heater inside the finished basement rooms or right next to them? *(Yes, one is in or right next to the finished rooms / No, none in or next to the finished rooms / Don't know)*
- For the new half bath, do the existing water lines or drain need to be made bigger? *(Yes, lines or drain must be made bigger / No, existing sizes are kept / Don't know)*
- The application needs a single estimated cost for the electrical work; an estimate is fine. What dollar figure should go on it? *(number)*
- The application needs a single estimated cost for the plumbing work; an estimate is fine. What dollar figure should go on it? *(number)*

**E-01**

- What kind of home is this property? *(Detached single-family house / Two-family house (two households) / Single-family home sharing a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned a new window over the tub. Is the opening new, is an existing opening being made bigger, or is the window being replaced in the same opening, unchanged? *(Same opening, unchanged / New opening where there was none / Existing opening made bigger / Don't know)*

**E-03**

- You mentioned it's a single family home. Which best describes the building? *(Detached single-family house / Two-family house (two households) / Single-family home sharing a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned somewhere around $14–16k depending on what you find under it. The application needs a single estimated cost for the job; an estimate is fine. What figure should go on it? *(number)*

**E-04**

- What kind of home is this? *(Detached single-family house / Two-family house (two households) / Attached single-family home sharing a wall (twin, townhouse, row house) / Building with three or more homes / Not a home (commercial or other) / Don't know)*
- You mentioned a new fan. Does installing the fan or its duct mean cutting any joists, studs or rafters? *(Yes, framing gets cut / No, no framing gets cut / Don't know)*
- You mentioned "the usual electrical." Does that only replace existing outlets, switches or lights like-for-like, or does it add new ones? *(Only replaces existing ones like-for-like / Adds new outlets, switches, lights or circuits / Don't know)*
- You mentioned "the usual electrical." How many outlets, switches and light fixtures does that work install in total? *(number)*

## Sample scope narratives (run 1)

### J-01

**claude-haiku-5-5**

> Building: Install new drywall throughout. Remove the non-bearing wall between the kitchen and dining room.
>
> Electrical: Add two new 20A counter circuits. Install 18 devices, including 8 recessed cans and island outlets.
>
> Plumbing: Relocate the sink to the new island. Install 1 dishwasher and 1 disposal on the new run.
>
> Also in this job: Install new cabinets. Install quartz countertops. Install LVP flooring. Range stays in place on the same gas hookup, with no gas line change and no electrical change.
>

**claude-sonnet-5-5**

> Building: Install new drywall throughout. Remove the non-bearing wall between the kitchen and dining room.
>
> Electrical: Install 18 devices, including 8 recessed cans and island outlets, on two new 20A counter circuits.
>
> Plumbing: Relocate the sink to the new island. Connect one dishwasher and one disposal on the new run, with one sink.
>
> Also in this job: Install new cabinets. Install quartz countertops. Install LVP flooring. The gas range stays in place on the same gas hookup, with no change to the fuel, gas line or electrical.
>

**claude-opus-5-5**

> Building: Install new drywall throughout. Remove the non-bearing wall between the kitchen and dining room.
>
> Electrical: Add two new 20A counter circuits. Install 18 new devices, including 8 recessed cans and island outlets.
>
> Plumbing: Relocate 1 sink to the new island. Connect 1 dishwasher and 1 disposal on the new sink run.
>
> Also in this job: Install new cabinets. Install quartz countertops. Install LVP flooring. The gas range stays in place on the same gas hookup, with no change to the gas line or electrical.
>

### J-04

**claude-haiku-5-5**

> Building: Frame, drywall and install a drop ceiling for partitions. Spray foam the rim joists. Family room and home office are new habitable spaces; neither is a bedroom and no fuel-burning appliance is nearby.
>
> Electrical: Install 26 devices (14 recessed lights and 12 outlets) on new 20A circuits. Install 2 hardwired smoke/CO combination alarms, tied into existing wiring.
>
> Plumbing: Install a new basement bathroom with 1 water closet, 1 lavatory and 1 shower. Install an ejector pit and ejector pump for the basement bathroom.
>
> Mechanical: Extend the supply duct in 3 runs.
>

**claude-sonnet-5-5**

> Building: Construct new partitions with framing and drywall, and install a drop ceiling. Spray foam the rim joists. Create habitable space consisting of a family room and a home office. Neither room is a bedroom, and there is no fuel-burning appliance nearby.
>
> Electrical: Install 26 devices (14 recessed lights and 12 outlets) on new 20A circuits. Install 2 hardwired smoke/CO combination alarms tied into the existing alarm system.
>
> Plumbing: Install a new basement bathroom with 1 water closet, 1 lavatory and 1 shower. Install an ejector pit with an ejector pump.
>
> Mechanical: Extend the supply ductwork with 3 new runs.
>

**claude-opus-5-5**

> Building: Create a family room and home office as new habitable space. No bedroom is being created. Frame new partition walls, install drywall and install a drop ceiling. Insulate the rim joists with spray foam.
>
> Electrical: Install 26 new devices (14 recessed lights and 12 receptacles) on new 20A circuits. Install 2 hardwired combination smoke/CO alarms tied into the existing alarms.
>
> Plumbing: Install a new basement bathroom with 1 water closet, 1 lavatory and 1 shower. Install an ejector pump in an ejector pit to serve the new bathroom.
>
> Mechanical: Extend the existing supply ductwork with 3 new supply runs.
>

### J-08

**claude-haiku-5-5**

> Electrical: Replace the gas furnace with an 80k BTU unit of the same size. The replacement furnace is gas-fired and the fuel type does not change. Replace the A/C condensing unit with a 3-ton unit of the same capacity. The condensing unit is installed in the same location.
>
> Mechanical: Replace the gas furnace with an 80k BTU unit of the same size. The replacement furnace is gas-fired and the fuel type does not change. Replace the A/C condensing unit with a 3-ton unit of the same capacity. The condensing unit is installed in the same location.
>
> Also in this job: Install a new thermostat.
>

**claude-sonnet-5-5**

> Electrical: Replace the gas furnace with a new 80k BTU gas furnace of the same capacity, with no change of fuel. Replace the 3-ton A/C condensing unit with a new unit of the same capacity in the same location.
>
> Mechanical: Replace the gas furnace with a new 80k BTU gas furnace of the same capacity, with no change of fuel. Replace the 3-ton A/C condensing unit with a new unit of the same capacity in the same location.
>
> Also in this job: Install a new thermostat.
>

**claude-opus-5-5**

> Electrical: Electrical work for the replacement gas furnace. Electrical work for the replacement 3-ton A/C condensing unit in the same location.
>
> Mechanical: Replace the existing gas furnace with an 80k BTU gas furnace of the same capacity. No change in fuel type. Replace the existing A/C condensing unit with a 3-ton unit of the same capacity in the same location.
>
> Also in this job: Install a new thermostat.
>

### J-11

**claude-haiku-5-5**

> Building: Install new drywall throughout. Remove the non-bearing wall between the kitchen and dining room.
>
> Electrical: Install 18 devices, including 8 recessed cans and island outlets, on two new 20A counter circuits.
>
> Plumbing: Relocate the sink to the new island. Install 1 dishwasher and 1 disposal on the new run.
>
> Also in this job: Install new cabinets. Install quartz countertops. Install LVP flooring.
>

**claude-sonnet-5-5**

> Building: Install new drywall throughout. Remove the non-bearing wall between the kitchen and dining room.
>
> Electrical: Install 18 devices on two new 20A counter circuits, including 8 recessed cans and island outlets.
>
> Plumbing: Relocate the kitchen sink to the new island. Connect one dishwasher and one disposal on the new run.
>
> Also in this job: Install new cabinets. Install quartz countertops. Install LVP flooring.
>

**claude-opus-5-5**

> Building: Install new drywall throughout. Remove the non-bearing wall between the kitchen and dining room.
>
> Electrical: Add two new 20A counter circuits. Install 18 devices, including 8 recessed cans and island outlets.
>
> Plumbing: Relocate the kitchen sink to the new island. Connect 1 dishwasher and 1 disposal on the new island run.
>
> Also in this job: Install new cabinets. Install quartz countertops. Install LVP flooring.
>
