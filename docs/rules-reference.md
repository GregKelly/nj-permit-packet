# Rules reference

*Generated from `rules/` by `npm run render-rules`. Don't edit this file; edit the YAML and regenerate. Rules version `26aec36ddd84`.*

This is the rule data the engine runs, in table form. The approved original is [rules-table-v1.md](rules-table-v1.md); the YAML is the source of truth from M1 on (design doc §4.2).

**How to read the "Applies when" column.** **Bold** is the work item kind; the rest are facts about that item (see `src/engine/facts.ts`). "or" between values means any of them. *or* between lines means any of those conditions. `unknown` in a list is how a rule takes the conservative branch when a fact isn't known. Within the item rules, the first rule that matches wins, in the order shown.

**Tiers.** OM = ordinary maintenance (no permit). MW = minor work (notice before starting, file within 5 business days). FULL = permit before work starts.

## 1. Scope check

| ID | Rule | Must be true | Otherwise |
|---|---|---|---|
| SC-01 | One- or two-family dwelling (use group R-3 / R-5) | prop_class: 2, dwelling_type: detached_1f or detached_2f or attached or unknown | Out of scope for v1. Permit Packet handles one- and two-family homes (R-3 / R-5) only. |
| SC-02 | Property is in Maplewood | municipality: Maplewood | Out of scope for v1. Permit Packet covers Maplewood, NJ only. |

## 2. Rules by project type

### 2.1 Kitchen & bath (KB)

*state/nj/kitchen-bath.yaml*

| ID | Rule | Applies when | Result | Reason / citation / notes |
|---|---|---|---|---|
| KB-01 | Replace or install cabinets, vanities, countertops, bathroom accessories | **finishes**, element: cabinets or vanity or countertops or bath_accessories | if element: countertops: **OM**<br>otherwise: **OM** | Replacing or installing cabinets and similar non-structural furnishings is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)1.vii*<br>Countertops aren't named in the code; treated as non-structural elements.<br>⚠️ A-3 |
| KB-02 | Replace or install flooring | **finishes**, element: flooring | **OM** | Flooring is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)1.ix* |
| KB-03 | Paint, wallpaper, trim, tile on walls | **finishes**, element: paint or wallpaper or trim or wall_tile | **OM** | Painting, wallpapering, trim and wall tile are ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)1.i, iii, viii* |
| KB-04 | Drywall/plaster on less than 25% of wall area | **drywall**, material: drywall or plaster, extent: under_25_percent | **OM** | Replacing less than 25% of the wall surface is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)1.ii* |
| KB-05 | Drywall/plaster on 25% or more of wall area, or any paneling | **drywall**, extent: 25_percent_or_more or unknown<br>*or* **drywall**, material: paneling | **MW** · F110 | Above 25% of the wall surface it isn't ordinary maintenance; renovation with no structural change is minor work.<br>*N.J.A.C. 5:23-2.7(c)1.ii; 5:23-2.17A(c)1.ii* |
| KB-06 | Replace a sink, toilet, tub or shower with a similar fixture in the same location, same piping | **fixture**, action: replace_same<br>*or* **faucet_valve** | **OM** | Replacing a fixture in the same place on the same piping, or replacing faucets and valves, is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)2.x; faucets and valves (incl. shower valves) 2.7(c)2.vi–viii* |
| KB-07 | Add a fixture in existing space, with no upsizing of water distribution, water service or house drain | **fixture**, action: add, upsizing_needed: no | **MW** · F130 | Adding a fixture without upsizing the water or drain system is minor work.<br>*N.J.A.C. 5:23-2.17A(c)2* |
| KB-08 | Relocate a fixture (any change in piping arrangement) | **fixture**, action: relocate or unknown<br>*or* **fixture**, action: add, upsizing_needed: yes or unknown<br>*or* **piping**, like_capacity: no or unknown | **FULL** · F130 | Changing the piping arrangement is excluded from ordinary maintenance, and relocation isn't on the minor work list.<br>*N.J.A.C. 5:23-2.7(b)6.ii*<br>"Relocate" includes a new fixture on a new piping run (J-01 dishwasher at the island). An added fixture that needs upsizing is outside KB-07, so it lands here too. <br>⚠️ Q-5 |
| KB-09 | Replace existing piping with like-capacity piping | **piping**, like_capacity: yes | **MW** · F130 | Replacing piping with like-capacity piping is minor work.<br>*N.J.A.C. 5:23-2.17A(c)2* |
| KB-10 | Replace receptacles, switches or light fixtures like-for-like | **electrical**, action: replace_same | **OM** | Like-for-like replacement of receptacles, switches and light fixtures is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)3.i*<br>GFCI/TR rules still apply (NEC 406.4(D)). |
| KB-11 | Add 5 or fewer outlets on existing circuits with adequate capacity | **electrical**, action: add or unknown, new_circuit: none, devices: ≤ 5 | **MW** · F120 | Up to 5 new outlets on existing circuits is minor work.<br>*N.J.A.C. 5:23-2.17A(c)4*<br>The new_circuit fact is "none" when the work stays on existing circuits with room for it. |
| KB-12 | New circuit for a range, oven, dryer or A/C | **electrical**, action: add or unknown, new_circuit: appliance, devices: ≤ 5<br>*or* **appliance**, fuel: electric, fuel_change: no, electrical_change: yes or unknown<br>*or* **appliance**, fuel: gas, fuel_change: no, gas_line_change: no, electrical_change: yes or unknown | **MW** · F120 | A new circuit incidental to installing a range, oven, dryer or A/C is minor work.<br>*N.J.A.C. 5:23-2.17A(c)4* |
| KB-13 | Any other new circuits, more than 5 outlets, or a panel/service change | **electrical**, action: add or unknown, new_circuit: other or unknown<br>*or* **electrical**, action: add or unknown, devices: > 5 or unknown<br>*or* **service_change** | **FULL** · F120 | New wiring beyond the minor work limits is excluded from ordinary maintenance and needs a permit before work starts.<br>*N.J.A.C. 5:23-2.7(b)6.iii*<br>Service upgrade needs utility coordination. |
| KB-14 | Replace dishwasher, range, oven or dryer; no change in fuel, pipe size, location or electrical | **appliance**, fuel: electric, fuel_change: no, electrical_change: no<br>*or* **appliance**, fuel: gas, fuel_change: no, gas_line_change: no, electrical_change: no | **OM** | Replacing an appliance with no change to fuel, piping, location or wiring is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)2.xi, 3.iv, 5.vii–viii* |
| KB-15 | Replace range hood: ≤ 400 cfm (or no higher than existing), recirculating or vented independently outdoors | **range_hood**, action: replace, cfm: ≤ 400<br>*or* **range_hood**, action: replace, cfm_increase: no | **OM** | Replacing a range hood at 400 cfm or less, or no higher than the existing one, is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)3.v, 5.vi* |
| KB-16 | New hood, or hood > 400 cfm | **range_hood**, action: new or unknown<br>*or* **range_hood**, cfm: > 400 or unknown, cfm_increase: yes or unknown | **FULL** · F120 + F145 | A new hood, or one over 400 cfm that's more powerful than the old one, isn't ordinary maintenance and may need make-up air.<br>*IRC M1503.6*<br>⚠️ A-4, Q-6 |
| KB-17 | Replace bath exhaust fan, vented independently outdoors | **exhaust_fan**, action: replace, vents_outdoors: yes | **OM** | Replacing an exhaust fan that already vents outdoors is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)5.ix* |
| KB-18 | New bath exhaust fan where none existed | **exhaust_fan**, action: new or unknown<br>*or* **exhaust_fan**, action: replace, vents_outdoors: no or unknown | if cuts_framing: yes or unknown: **MW** · F120 + F110<br>otherwise: **MW** · F120 | A new fan on an existing circuit is minor work.<br>*N.J.A.C. 5:23-2.17A(c)4*<br>⚠️ A-5 |
| KB-19 | New or relocated gas line (range, dryer) | **gas_line**<br>*or* **appliance**, fuel: gas or unknown, gas_line_change: yes or unknown<br>*or* **appliance**, fuel_change: yes or unknown | **FULL** · F130 | New, moved or resized gas piping is excluded from ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(b)6.ii*<br>F130 and F145 both list gas piping; v1 puts it on F130.<br>⚠️ A-6 |
| KB-20 | Remove or move a non-bearing wall | **wall_change**, bearing: no | **MW** · F110 | Reconfiguring space without altering primary structural members is minor work.<br>*N.J.A.C. 5:23-2.17A(c)1.ii*<br>⚠️ A-7 |
| KB-21 | Remove or cut a bearing wall, beam or post | **wall_change**, bearing: yes or unknown | **FULL** · F110 | Cutting a load-bearing wall is excluded from ordinary maintenance and isn't minor work.<br>*N.J.A.C. 5:23-2.7(b)1–2; 5:23-2.17A(c)1.ii* |
| KB-22 | Replace a window or door in the same opening, no change to size or framing | **opening**, action: replace_same | **OM** | Replacing a window or door in the same opening is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)1.v*<br>If it's an egress window, the net clear opening can't shrink. |
| KB-23 | New or enlarged window/door opening | **opening**, action: new or enlarge or unknown | **FULL** · F110 | A new or enlarged opening alters structure (header).<br>*N.J.A.C. 5:23-2.7(b)2*<br>Exterior work, so the zoning trigger applies.<br>⚠️ A-7 |
| KB-24 | Any work in a building with lead abatement | **lead_abatement** | **FULL** · F110 · stop | Lead abatement work is excluded from both ordinary maintenance and minor work.<br>*N.J.A.C. 5:23-2.7(b)7; 5:23-2.17A(c)6* |

### 2.2 Finished basement (FB)

*state/nj/basement.yaml*

| ID | Rule | Applies when | Result | Reason / citation / notes |
|---|---|---|---|---|
| FB-01 | Frame new non-bearing partitions; drywall; ceiling | **partitions** | **MW** · F110 | Renovation with no primary structural change is minor work.<br>*N.J.A.C. 5:23-2.17A(c)1.ii*<br>Drywall here will almost always exceed 25% (KB-05 logic). Floor plan shows room uses, ceiling height, egress, smoke/CO alarm locations.<br>⚠️ A-7 |
| FB-02 | Insulation installed against interior finish (non-foam is ordinary maintenance; foam plastic isn't) | **insulation** | if type: non_foam: **OM**<br>otherwise: **MW** · F110 | Insulation is ordinary maintenance unless it's foam plastic.<br>*N.J.A.C. 5:23-2.7(c)1.xv* |
| FB-03 | Space becomes habitable (family room, office, bedroom) | **habitable_space**, bedroom: no | **MW** · F110 | Making space habitable without structural change is minor work, same as FB-01.<br>*N.J.A.C. 5:23-2.17A(c)1.ii*<br>Flag: ceiling height for habitable space (IRC R305).<br>⚠️ A-7, Q-7 |
| FB-04 | A bedroom is created | **habitable_space**, bedroom: yes or unknown | **FULL** · F110 | A bedroom needs an emergency escape and rescue opening, so it needs a permit before work starts.<br>*IRC R310*<br>Plans must show the emergency escape opening. If no compliant window exists, see FB-05.<br>⚠️ A-7 |
| FB-05 | New or enlarged egress window / areaway (foundation cut) | **egress_window** | **FULL** · F110 | Cutting the foundation for an egress window alters structure.<br>*N.J.A.C. 5:23-2.7(b)2*<br>Exterior work, so the zoning trigger applies. May affect impervious coverage. |
| FB-06 | New bathroom (toilet, lav, shower) | **new_bathroom** | if ejector_pump: yes or unknown: **FULL** · F130<br>if upsizing_needed: yes or unknown: **FULL** · F130<br>otherwise: **MW** · F130 | A new bathroom is minor work unless it upsizes the drain/water system or needs an ejector pump.<br>*N.J.A.C. 5:23-2.17A(c)2*<br>Bath fan and lights are separate electrical items (F120).<br>⚠️ A-8, Q-5 |
| FB-07 | Electrical: lights, outlets, circuits | *Covered by KB-10, KB-11, KB-12, KB-13* | | Classified by the kitchen & bath electrical rules. A basement finish usually exceeds 5 outlets, so usually FULL. |
| FB-08 | Smoke and CO alarms (hardwired is minor work; battery or plug-in is ordinary maintenance) | **smoke_co_alarm** | if power: battery or plug_in: **OM**<br>otherwise: **MW** · F120 | Alarms are minor work when hardwired, ordinary maintenance when battery or plug-in.<br>Show on the floor plan. Hardwired alarms go on the F120 "Detectors" line.<br>⚠️ Q-8 |
| FB-09 | Extend ductwork / add supply registers into new space | **ductwork**, action: extend or unknown | **MW** · F145 | Extending ductwork into new finished space is treated as minor work on the mechanical section.<br>*Repair or replacement is ordinary maintenance (HV-05), 2.7(c)5.iii*<br>Flag: furnace capacity for added conditioned space is the reviewer's call.<br>⚠️ A-9 |
| FB-10 | Bearing wall, post or beam changes | *Covered by KB-21* | | Same as KB-21. |
| FB-11 | Fuel-fired appliance (furnace, water heater) is in or next to the new finished room | *Covered by TP-04* | | Flag only, shown as tip TP-04. F145 only if the appliance itself is touched. |

### 2.3 Roof replacement (RF)

*state/nj/roof.yaml*

| ID | Rule | Applies when | Result | Reason / citation / notes |
|---|---|---|---|---|
| RF-01 | Repair or replace existing roof covering on a detached one- or two-family dwelling | **roof_covering**, property.dwelling_type: detached_1f or detached_2f | **OM** | Re-roofing a detached one- or two-family home is ordinary maintenance. No permit.<br>*N.J.A.C. 5:23-2.7(c)1.x* |
| RF-02 | Same, on an attached dwelling (twin, townhouse) | **roof_covering**, property.dwelling_type: attached or unknown | **MW** · F110 | The roofing exemption covers detached dwellings only; re-roofing an attached dwelling is renovation with no structural change, so minor work.<br>*N.J.A.C. 5:23-2.7(c)1.x; 5:23-2.17A(c)1.ii*<br>⚠️ A-10 |
| RF-03 | Replace damaged sheathing/decking in addition to the covering | **roof_decking**, rafters_touched: no | if property.dwelling_type: detached_1f or detached_2f: **OM**<br>otherwise: **MW** · F110 | Same tier as the roof covering (RF-01/RF-02) unless rafters are touched.<br>*Code doesn't address decking explicitly*<br>⚠️ A-11 |
| RF-04 | Repair or replace rafters, joists or ridge (any structural member) | **roof_structure**<br>*or* **roof_decking**, rafters_touched: yes or unknown | **FULL** · F110 | Work on roof structural members isn't ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(b)2, (b)4* |
| RF-05 | Add a skylight or other new roof opening | **skylight** | **FULL** · F110 | A new roof opening cuts structural members.<br>*N.J.A.C. 5:23-2.7(b)2*<br>Exterior, so zoning applies. |
| RF-06 | Change roof shape, pitch or height; add a dormer | **roof_shape_change** | **FULL** · F110 | Changing the roof shape is structural, and height/bulk is a zoning matter.<br>*N.J.A.C. 5:23-2.7(b)2*<br>Zoning applies. |
| RF-07 | Replace gutters and leaders | **gutters** | **OM** | Gutters and leaders are ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)1.xvi* |
| RF-08 | Replace siding (not polypropylene) | **siding**, material: other | **OM** | Replacing siding other than polypropylene is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)1.xi*<br>Polypropylene siding matches no rule, so the app says "call the office". |
| RF-09 | Third layer of roofing / roof-over existing | *Covered by TP-01* | | Not a permit question; non-blocking tip TP-01 (IRC R908). |

### 2.4 HVAC (HV)

*state/nj/hvac.yaml*

| ID | Rule | Applies when | Result | Reason / citation / notes |
|---|---|---|---|---|
| HV-01 | Replace a furnace, low-pressure boiler, A/C unit or condenser with one of like capacity | **hvac_equipment**, equipment: furnace or boiler, action: replace, like_capacity: yes, fuel_change: no | if fuel: gas or oil or propane or unknown: **MW** · F145 + F120 + F370<br>otherwise: **MW** · F145 + F120 | Replacing heating equipment with like capacity is minor work.<br>*N.J.A.C. 5:23-2.17A(c)3; electrical 2.17A(c)4*<br>⚠️ Q-3, Q-4 |
| HV-02 | Replace with different capacity, or change fuel type (e.g. oil → gas) | **hvac_equipment**, action: replace, like_capacity: no or unknown<br>*or* **hvac_equipment**, equipment: furnace or boiler, action: replace, fuel_change: yes or unknown<br>*or* **water_heater**, action: replace, like_capacity: no or unknown<br>*or* **water_heater**, action: replace, fuel_change: yes or unknown | if **hvac_equipment**, equipment: furnace or boiler, fuel_change: yes or unknown, fuel: gas or unknown: **FULL** · F145 + F120 + F130<br>if **water_heater**, fuel_change: yes or unknown, fuel: gas or unknown: **FULL** · F145 + F130<br>if **water_heater**: **FULL** · F145<br>otherwise: **FULL** · F145 + F120 | Different capacity or a fuel change is outside "like capacity" minor work.<br>*Outside N.J.A.C. 5:23-2.17A(c)3*<br>Oil tank removal is flagged separately (out of scope).<br>⚠️ A-6, Q-10 |
| HV-03 | New system where none existed (central A/C, heat pump, mini-split) | **hvac_equipment**, action: new or unknown<br>*or* **water_heater**, action: new or unknown | if cuts_framing: yes or unknown: **FULL** · F145 + F120 + F110<br>otherwise: **FULL** · F145 + F120 | A new system isn't a replacement, so it isn't minor work.<br>*Not within N.J.A.C. 5:23-2.17A(c)3*<br>Line-set and vent holes don't count as cutting framing. A new outdoor unit is exterior, so zoning applies (setbacks).<br>⚠️ Q-10 |
| HV-04 | Replace a water heater with like capacity | **water_heater**, action: replace, like_capacity: yes, fuel_change: no | if fuel: gas or oil or propane or unknown: **MW** · F145 + F370<br>otherwise: **MW** · F145 | Replacing a water heater with like capacity is minor work.<br>*N.J.A.C. 5:23-2.17A(c)2*<br>Water heater appears on both F130 and F145; v1 uses F145.<br>⚠️ A-6 |
| HV-05 | Repair or replace ductwork | **ductwork**, action: repair_replace | **OM** | Repairing or replacing ductwork is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)5.iii* |
| HV-06 | Replace motors, pumps, fans of same capacity; repair A/C; replace controls/thermostats | **hvac_component** | **OM** | Like-for-like motors, pumps and fans, A/C repair, and controls are ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)5.i, iv, v* |
| HV-07 | Repair or replace heating supply/return piping or radiators, no rearrangement | **hydronic_piping**, action: repair_replace | **OM** | Repairing heating piping or radiators without rearranging them is ordinary maintenance.<br>*N.J.A.C. 5:23-2.7(c)5.ii* |
| HV-08 | Rearrange hydronic piping or add zones | **hydronic_piping**, action: rearrange or unknown | **FULL** · F145 | Rearranging hydronic piping is on neither the ordinary maintenance nor the minor work list.<br>⚠️ A-12 |
| HV-09 | New or modified chimney/vent; direct-vent conversion | **chimney_vent** | if action: liquid_liner: **OM**<br>if new_penetration: yes or unknown: **FULL** · F145 + F110<br>otherwise: **FULL** · F145 | A new or modified chimney or vent needs a permit before work starts. |
| HV-10 | Condenser relocated to a new spot | **hvac_equipment**, equipment: ac_condenser or heat_pump or mini_split, action: replace, like_capacity: yes, same_location: no or unknown | **FULL** · F145 + F120 | Moving an outdoor unit isn't a like-for-like replacement.<br>Exterior, so zoning applies (setbacks). Site sketch. |
| HV-11 | Like-for-like condenser in the same location | **hvac_equipment**, equipment: ac_condenser or heat_pump or mini_split, action: replace, like_capacity: yes, same_location: yes | **MW** · F145 + F120 | Replacing an outdoor unit with like capacity in the same spot is minor work (as HV-01).<br>*N.J.A.C. 5:23-2.17A(c)3*<br>Zoning: like-for-like, so ZN-03 note. |

## 3. Zoning prior approval (Maplewood)

Config flags (`municipal/maplewood/config.yaml`): `interior_alterations_require_zoning: false`, `exterior_like_for_like_requires_zoning: false`.

| ID | Rule | Applies when | Result | Notes |
|---|---|---|---|---|
| ZN-01 | All work items are interior |  | not_required | No zoning application needed for interior work.<br>Flag: `interior_alterations_require_zoning`<br>⚠️ A-13 |
| ZN-02 | Exterior work that changes footprint, height, openings, outdoor equipment or lot coverage | **opening**, opening: window or exterior_door, action: new or enlarge or unknown<br>*or* **egress_window**<br>*or* **skylight**<br>*or* **roof_shape_change**<br>*or* **hvac_equipment**, equipment: ac_condenser or heat_pump or mini_split, action: new or unknown<br>*or* **hvac_equipment**, equipment: ac_condenser or heat_pump or mini_split, action: replace, same_location: no or unknown | required | Zoning permit required before submitting the construction permit.<br>Checklist: Maplewood residential zoning application; Survey to scale showing the work; Impervious coverage calculation; $50 zoning fee; Zoning approval before submitting this packet |
| ZN-03 | Exterior work that is like-for-like replacement | **roof_covering or roof_decking or gutters or siding**<br>*or* **opening**, opening: window or exterior_door, action: replace_same<br>*or* **hvac_equipment**, equipment: ac_condenser or heat_pump or mini_split, action: replace, same_location: yes | probably_not_required | Zoning permit probably not required for like-for-like replacement. Confirm with Maplewood Zoning, 973-762-8120 ext. 5602.<br>Flag: `exterior_like_for_like_requires_zoning`<br>⚠️ A-15 |
| ZN-04 | Job is ordinary maintenance only, but ZN-02 applies |  |  | No construction permit, but a zoning permit applies.<br>The outcome becomes "zoning_only" and the app prints that sheet instead of a packet. |
| ZN-05 | Zoning trigger fact is unknown |  |  | Treated as needing zoning because a fact wasn't known. Change it if you confirm otherwise.<br>Ask first; if still unknown, ZN-02 applies (conservative branch). |

## 4. Forms and signers

| Form | Name | Included when | Signed by | Notes |
|---|---|---|---|---|
| F100 | Construction Permit Application | Every minor work or full permit job | owner_or_agent | Owner, or the contractor as agent with our owner authorization page attached. |
| F110 | Building Subcode Technical Section | Any building item (walls, drywall ≥ 25%, structural, openings, attached reroof) | applicant |  |
| F120 | Electrical Subcode Technical Section | Any electrical item | electrical | Form has "Sign and Seal" and a Licensed/Exempt checkbox. Who signs it on HVAC swaps is Q-3 (see HV-01). ⚠️ A-2 |
| F130 | Plumbing Subcode Technical Section | Any plumbing item; gas piping (A-6) | plumbing | ⚠️ A-2 |
| F145 | Mechanical Inspection Technical Section (R-3/R-5) | Furnace, boiler, A/C, water heater (A-6), fireplace, generator, fuel connections | hvacr | ⚠️ A-2 |
| F140 | Fire Protection Subcode Technical Section | Not used in v1 R-3/R-5 scope; F145 covers fuel-fired appliances there | none | ⚠️ A-14 |
| F370 | Chimney Verification | Replacing fuel-fired equipment (HV-01, HV-04) | hvacr | ⚠️ Q-4 |
| F390 | Framing checklist | Possibly basement finishes and new framing; not added in v1 | none | ⚠️ Q-4 |
| F392 | Air-barrier checklist | Possibly basement finishes and new framing; not added in v1 | none | ⚠️ Q-4 |

## 5. Plans

| ID | Rule | Applies when the job has | Requirement | Message |
|---|---|---|---|---|
| PL-01 | Any structural item | KB-21, KB-23, FB-05, FB-10, RF-04, RF-05, RF-06 | sealed | Plans required, sealed by an NJ-licensed architect or engineer. |
| PL-02 | Space reconfiguration or new habitable space | KB-20, FB-01, FB-03, FB-04 | floor_plan | Floor plan required. An unsealed contractor sketch is assumed acceptable. ⚠️ A-7, Q-2 |
| PL-03 | New system or capacity change | HV-02, HV-03 | none | No plans required, but the office may ask for the equipment location and a load calculation. ⚠️ Q-10 |
| PL-04 | Everything else (replacements, minor trade work) | *(anything else)* | none | No plans needed. |

## 6. Work type, cost and quantities

| ID | Field(s) | Rule |
|---|---|---|
| CQ-01 | F100 §IIa Proposed work | Exactly one box. Minor Work if the job tier is MW. Otherwise Alteration if any permitted item rearranges space, adds or removes a door, window or skylight, extends or rearranges a system, adds fixtures or equipment, or touches structure (rules marked `alteration: true`); else Renovation. ⚠️ A-21 |
| CQ-02 | F100 §IIb Subcodes + Est. Cost | Check each subcode that has a section in the packet and enter that trade's cost; Total Cost = sum. F100 has no Mechanical row, so F145 cost goes on the Plumbing row. ⚠️ A-20, Q-11 |
| CQ-03 | Which costs count | Only trades with a section in the packet. A trade whose items are all ordinary maintenance is left out. One trade takes the remainder of the total when its own cost isn't stated: the first of these that has a section. Any other missing trade cost is asked. ⚠️ A-16 |
| CQ-04 | Tech section "Est. Cost of … Work" | That trade's cost. On F110, the Rehabilitation line and the Total line (New Bldg. blank). |
| CQ-05 | F110 Type of work | Rehabilitation for interior or alteration work; Roofing for roof items; Siding for siding; check all that apply. |
| CQ-06 | Use group (F100 §VII, every tech section) | R-5 for one- and two-family dwellings, present and proposed. ⚠️ A-19 |
| CQ-07 | Quantity lines (F120 devices/detectors/kW items, F130 fixtures, F145 equipment) | One count per form line, covering every fixture, device or appliance installed for that trade in the job, including like-for-like ones once the section is in the packet. Items with no form line go on "Other" with a short label. See `lines` below. ⚠️ A-17 |
| CQ-08 | Size columns and other equipment details | Fill in when the contractor gave the detail. Otherwise leave blank and add "fill in sizes/details" for that subcontractor on the cover checklist. No follow-up question. |
| CQ-09 | F145 Heating system checkboxes | New / Replacement / Conversion / Modification, Hydronic / Hot Air, and fuel, from the HVAC facts. Leave blank for cooling-only work. See `heating_system` below. |
| CQ-10 | All "Fee (Office Use Only)" boxes, surcharges, F100 §V | Left blank. |

**Quantity lines (CQ-07)**

| Form | Line | Counts | How many |
|---|---|---|---|
| F120 | Devices | **electrical** | the item's devices |
| F120 | Devices | **range_hood** | 1 each |
| F120 | Detectors | **smoke_co_alarm**, power: hardwired (marked Smoke) | the item's count |
| F120 | KW Range | **appliance**, appliance: range or oven or cooktop, fuel: electric (has a size column) | 1 each |
| F120 | KW Dryer | **appliance**, appliance: dryer, fuel: electric (has a size column) | 1 each |
| F120 | KW Dishwasher/Disposal | **fixture** (has a size column) | fixtures: dishwasher, disposal |
| F120 | KW Central AC Unit | **hvac_equipment**, equipment: ac_condenser or heat_pump (has a size column) | 1 each |
| F120 | KW Mini Split | **hvac_equipment**, equipment: mini_split (has a size column) | 1 each |
| F120 | HP/KW Furnace | **hvac_equipment**, equipment: furnace (has a size column) | 1 each |
| F120 | Other | **electrical**, equipment: radiant_floor_heat or other (labelled with the item) | 1 each |
| F130 | Water closet | **fixture or new_bathroom** | fixtures: water_closet |
| F130 | Lavatory | **fixture or new_bathroom** | fixtures: lavatory |
| F130 | Sink | **fixture or new_bathroom** | fixtures: sink |
| F130 | Bathtub | **fixture or new_bathroom** | fixtures: bathtub |
| F130 | Shower | **fixture or new_bathroom** | fixtures: shower |
| F130 | Dishwasher | **fixture** | fixtures: dishwasher |
| F130 | Washing machine | **fixture** | fixtures: washing_machine |
| F130 | Floor drain | **fixture or new_bathroom** | fixtures: floor_drain |
| F130 | Hose bibb | **fixture** | fixtures: hose_bibb |
| F130 | Sewer pump | **new_bathroom**, ejector_pump: yes | 1 each |
| F130 | Gas piping | **appliance or gas_line or hvac_equipment or water_heater** (classified KB-19 or HV-02) | 1 each |
| F145 | Hot Air Furnace | **hvac_equipment**, equipment: furnace | 1 each |
| F145 | Boiler | **hvac_equipment**, equipment: boiler | 1 each |
| F145 | Water Heater | **water_heater** | 1 each |
| F145 | Other | **hvac_equipment**, equipment: ac_condenser or heat_pump or mini_split (labelled with the item) | 1 each |
| F145 | Other | **range_hood** (labelled with the item) | 1 each |
| F145 | Other | **ductwork**, action: extend (labelled with the item) | 1 each |

**F145 heating system (CQ-09)**: the first row that matches a work item applies; fuel comes from the item.

| Applies when | Work | Distribution |
|---|---|---|
| **hvac_equipment**, equipment: furnace, action: new or unknown | New | Hot Air |
| **hvac_equipment**, equipment: furnace, action: replace, fuel_change: yes | Conversion | Hot Air |
| **hvac_equipment**, equipment: furnace, action: replace | Replacement | Hot Air |
| **hvac_equipment**, equipment: boiler, action: new or unknown | New | Hydronic |
| **hvac_equipment**, equipment: boiler, action: replace, fuel_change: yes | Conversion | Hydronic |
| **hvac_equipment**, equipment: boiler, action: replace | Replacement | Hydronic |
| **ductwork**, action: extend | Modification | Hot Air |
| **hydronic_piping**, action: rearrange | Modification | Hydronic |

## 7. Licensing and registration

| ID | Check | Flag | Blocks printing |
|---|---|---|---|
| LC-01 | Contractor profile missing HIC registration | NJ home improvement contractors must be registered. Add your HIC | no |
| LC-02 | F120/F130/F145 included but no matching licensed sub in the directory | Add the licensed {trade_person} who'll sign {form}. | no |
| LC-03 | Sub's license expiry before today | {name}'s {trade} license expired {expires}. The office will likely reject their section, and they may not legally do or sign for this work until the license is renewed. Update the license or pick another sub before submitting. | no |
| LC-04 | Year built before 1978 | *Shown as TP-05* | no |
| LC-05 | The owner is doing building-section (F110) work on a contractor's job | Out of scope: the owner doing building work themselves isn't supported. | yes |

## 8. Homeowner does their own trade work

*state/nj/homeowner.yaml*. Switches: `two_family_owner_electrical: true`, `two_family_owner_plumbing_hvacr: false`.

**Trades the owner may do**

| Trade | Sections | F100 Owner Section box | License box on the owner's section | Instead, assign a |
|---|---|---|---|---|
| electrical (`electrical`) | F120 | C.3 | Exempt: homeowner, N.J.S.A. 45:5A-18(n) | licensed electrician |
| plumbing (`plumbing`) | F130 | C.4 | Exempt: homeowner, N.J.S.A. 45:14C-12.4 | licensed master plumber |
| HVACR (`mechanical`) | F145, F370 | *none* (Q-13) | Exempt: homeowner, N.J.S.A. 45:16A-9 | licensed HVACR contractor |

HIC box on every owner-performed section: Exempt: owner, N.J.A.C. 5:23-2.15(b)8.ii

**Eligibility checks.** For each trade the owner does, the first check that fails blocks printing.

| ID | Check | Applies to | Passes when | Message if it fails | Notes |
|---|---|---|---|---|---|
| HO-01 | The owner lives in the home (for electrical only, an immediate family member living there also counts) | every trade | owner_occupied: yes<br>*or* trade: electrical, owner_occupied: immediate_family | The owner can do their own {trade} work only in a home they live in. Assign a {trade_person}. | *N.J.S.A. 45:5A-18(n); 45:14C-12.4 and N.J.A.C. 13:32-1.4(f)1 ("his or her own dwelling"); 45:16A-9 ("personally occupies"); 2019 board answers 1b*<br>⚠️ A-25 |
| HO-02 | Plumbing by the owner: single-family detached, or attached with its own sewer | plumbing | dwelling_type: detached_1f<br>*or* dwelling_type: attached, own_sewer: yes<br>*or* dwelling_type: detached_2f, switch: two_family_owner_plumbing_hvacr | if dwelling_type: attached: NJ plumbing law lets only a single-family homeowner do their own plumbing, and this home doesn't count because it shares a sewer line with the neighbor. Assign a licensed master plumber.<br>otherwise: NJ plumbing law lets only a single-family homeowner do their own plumbing. Assign a licensed master plumber. | *N.J.S.A. 45:14C-12.4; N.J.A.C. 13:32-1.4(f)1; Plumbing Board answers 2 and 3*<br>⚠️ A-26, Q-16 (when dwelling_type: detached_2f or unknown) |
| HO-03 | HVACR by the owner: single-family detached or attached | mechanical | dwelling_type: detached_1f or attached<br>*or* dwelling_type: detached_2f, switch: two_family_owner_plumbing_hvacr | NJ HVACR law lets only a single-family homeowner do their own HVACR work. Assign a licensed HVACR contractor. | *N.J.S.A. 45:16A-9; N.J.A.C. 13:32A-1.1(b)3; HVACR Board answer 2*<br>⚠️ A-26, Q-16 (when dwelling_type: detached_2f or unknown) |
| HO-04 | HVACR by the owner includes no refrigerant work (A/C or condensing unit, heat pump, mini-split) | mechanical | the owner's items include none of: **hvac_equipment**, equipment: ac_condenser or heat_pump or mini_split | Work on the {item} involves refrigerant, which the owner can't do under the homeowner exemption. Assign a licensed HVACR contractor for all the HVACR work. | *N.J.S.A. 45:16A-9 (CFC/HCFC exception), read conservatively*<br>Furnace, boiler, water heater, ductwork, controls and gas connections are fine.<br>⚠️ A-24 |
| HO-05 | One signer per technical section: the owner does all of a trade's work on the job, or none of it | every trade | the owner does all of the trade, not some | One person must do and sign for all the {trade} work on this permit. Assign either the owner or {sub} to all of it. | *Each section has a single signer and license block (F120/F130/F145 §C)* |
| HO-06 | Electrical by the owner: any one- or two-family home in v1 scope, if HO-01 passes | electrical | dwelling_type: detached_1f or attached<br>*or* dwelling_type: detached_2f, switch: two_family_owner_electrical | With assumption A-23 switched off, an owner in a two-family home can't do their own electrical work. Assign a licensed electrician. | *N.J.S.A. 45:5A-18(n); Electrical Board answer*<br>⚠️ A-23, Q-15 (when dwelling_type: detached_2f or unknown) |

**Forms, signers and entries when every owner-performed trade passes**

| ID | Form / field | Rule |
|---|---|---|
| HO-F1 | F100 | The owner is the applicant and signs. Owner Section: box C checked; C.3 Electrical and/or C.4 Plumbing for the trades the owner does; D checked (contractors are on the job). C.1 and C.2 are left blank. The Agent Section is left blank. The contractor stays on page 1 as Principal Contractor. There's no box for HVACR. ⚠️ Q-12 |
| HO-F2 | Owner authorization page | Left out. The owner signs F100 themselves. |
| HO-F3 | Each owner-performed section (F120 / F130 / F145) | Exempt Applicant checked. The contractor block gets the owner's name, address, phone and email. License box: that trade's `exempt_license` above. License expiry blank. HIC box: `exempt_hic` above. FEIN blank. The owner signs. |
| HO-F4 | F370, when the owner replaces a fuel-fired appliance | Signed by the owner. ⚠️ Q-13 |
| HO-F5 | Estimated cost of an owner-performed trade (CQ-02, CQ-04) | The figure the contractor enters for the owner's work. If none is stated, it's asked. The owner's work isn't part of the contract total, so an owner-performed trade never takes the remainder of the total (CQ-03). ⚠️ A-27, Q-14 |
| HO-F6 | Fill-ins (CQ-08) | Sizes the contractor didn't give go to the owner as signer. |

**Cover checklist lines**

| ID | Line | Source |
|---|---|---|
| HO-T1 | You must do the {trade} work yourself. Under the homeowner exemption, friends, relatives or a handyman can't do it for you. | N.J.S.A. 45:16A-9 ("solely performs"); town guidance |
| HO-T2 | The estimated cost for your {trade} work is the figure given ({amount}). Ask the construction office whether to include the value of your own labor. |  ⚠️ A-27 |

## 9. Reviewer tips (non-blocking)

| ID | Trigger | Applies when | Tip |
|---|---|---|---|
| TP-01 | Roof-over or third layer (RF-09) | **roof_covering**, existing_layers: two_or_more | Code limits re-covering over existing roofing (IRC R908). Expect tear-off to be required if there are already two layers. |
| TP-02 | Range hood > 400 cfm (KB-16) | **range_hood**, cfm: > 400 | Hoods over 400 cfm generally need make-up air (IRC M1503.6). Be ready to show how it's provided. |
| TP-03 | Basement made habitable (FB-03) | **habitable_space** | Reviewers check ceiling height in finished basements. Note the clear height on the floor plan. |
| TP-04 | Fuel-fired appliance near new finished space (FB-11) | **habitable_space**, fuel_appliance_nearby: yes | Show the furnace/water heater on the plan with clearances and combustion air. |
| TP-05 | Year built before 1978 (LC-04) | property: year_built: < 1978 | Lead-safe work practices may apply to disturbing painted surfaces. |

## 10. Submitting the packet

| ID | Line on the cover checklist | When | Source |
|---|---|---|---|
| SB-01 | Submit one original plus three copies of each completed form. | every packet | DCA construction permit forms page ⚠️ A-22 |
| SB-02 | Bring at least two copies of the plans. | plans: sealed or floor_plan | N.J.A.C. 5:23-2.15(f)1 |

## 11. Assumptions register

| ID | Assumption | How to confirm |
|---|---|---|
| A-1 | The LII copy of N.J.A.C. 5:23-2.7 / 2.17A is the current text | Current N.J.A.C. on the OAL/LexisNexis NJ site, or DCA Code Assistance (609-292-7898) |
| A-2 | Each licensed trade signs its own technical section (F120/F130/F145) | Maplewood Construction Office |
| A-3 | Countertops count as non-structural "furnishings" (ordinary maintenance) | DCA Code Assistance |
| A-4 | A new range hood over 400 cfm goes on F145 + F120 | Construction office |
| A-5 | A new bath fan on an existing circuit is minor work | Construction office |
| A-6 | Gas piping goes on F130; water heaters go on F145 (both appear on both forms) | Construction office: which section they want for each |
| A-7 | An unsealed contractor floor plan is acceptable for non-structural reconfiguration and basement finishes | Construction office (Q-2) |
| A-8 | A basement ejector pump pushes the bathroom to a full permit | Construction office |
| A-9 | Extending ductwork into new finished space is minor work on F145 | Construction office |
| A-10 | Reroofing an attached dwelling is minor work (not a full permit) | DCA Code Assistance |
| A-11 | Replacing decking/sheathing stays within "roof covering" repair | DCA Code Assistance |
| A-12 | Rearranging hydronic piping needs a full permit | Construction office |
| A-13 | Purely interior work needs no zoning application (settled v1 assumption) (switch `interior_alterations_require_zoning`) | Maplewood Zoning, 973-762-8120 ext. 5602 |
| A-14 | F140 isn't needed for the four v1 project types in R-3/R-5 | Construction office |
| A-15 | Like-for-like exterior replacement needs no zoning permit (shown as a "confirm with Zoning" note) (switch `exterior_like_for_like_requires_zoning`) | Maplewood Zoning, 973-762-8120 ext. 5602 |
| A-16 | The estimated cost on the permit is the contract value of the trades that have a section in the packet; trades with only ordinary-maintenance items are left out | Construction office |
| A-17 | Quantity lines count every fixture/device installed for that trade in the job, including like-for-like ones | Construction office |
| A-18 | Hardwired smoke/CO combination alarms go on the F120 Detectors line, marked Smoke | Construction office |
| A-19 | One- and two-family dwellings (incl. twins) are use group R-5 on the forms | Construction office |
| A-20 | With no Mechanical row on F100, F145 work is costed on the Plumbing row | Construction office (Q-11) |
| A-21 | F100 "Alteration" vs "Renovation" follows the Rehabilitation Subcode definitions (N.J.A.C. 5:23-6.3) as summarized in CQ-01 | DCA Code Assistance |
| A-22 | The office wants one original plus three copies of each completed form (DCA construction permit forms page) | Maplewood Construction Office |
| A-23 | An owner (or immediate family) living in a two-family home may do their own electrical work, per the Electrical Board's 2019 answer (switch `two_family_owner_electrical`) | Maplewood electrical subcode official (Q-15). At least one town (Ridgefield Park) reads it the other way |
| A-24 | The owner may do no refrigerant work at all (A/C, heat pump, mini-split), not only the CFC/HCFC work the HVACR law names | HVACR Board (Division of Consumer Affairs) |
| A-25 | The homeowner-exemption statute text (read on onecle, FindLaw and Cornell LII) matches the official text | Official NJ statutes (pub.njleg.gov) and N.J.A.C., as with A-1 |
| A-26 | An owner living in a two-family home may not do their own plumbing or HVACR work, per the "single family" wording in both laws and the 2019 board answers (switch `two_family_owner_plumbing_hvacr`) | Plumbing Board and HVACR Board, or DCA Code Assistance at (609) 984-7609 (Q-16) |
| A-27 | The estimated cost of an owner-performed trade is the figure entered for it (no added value for the owner's labor) | Construction office (Q-14) |

## 12. Questions for the construction office

| ID | Question | Status |
|---|---|---|
| Q-1 | Like-for-like exterior work and zoning. Resolved: zoning only for footprint, height, openings, outdoor equipment or lot coverage (ZN-02/03). | resolved |
| Q-2 | When is an unsealed contractor sketch accepted (wall moves, basement finish), and when must plans be sealed? | open |
| Q-3 | For an A/C or furnace swap, who signs F120: an electrician, or the HVACR contractor? | open |
| Q-4 | Do they want F370 on every fuel-fired replacement, and F390/F392 on basement finishes? | open |
| Q-5 | Do they want a plumbing riser diagram for relocated or added fixtures? | open |
| Q-6 | Make-up air for range hoods over 400 cfm: what do they need to see? | open |
| Q-7 | Minimum ceiling height they enforce for finished basements. | open |
| Q-8 | Do they require hardwired interconnected smoke/CO alarms when a basement is finished? | open |
| Q-9 | Reviewer-style warnings. Resolved: included as non-blocking tips (§4.6). | resolved |
| Q-10 | For new or resized HVAC, do they want a Manual J load calculation? | open |
| Q-11 | F100 has no Mechanical row in §IIb. Where do they want the cost of F145 work: the Plumbing row, or written in? | open |
| Q-12 | When the owner does one trade and a contractor does the rest, is it one application with the owner as applicant, or a separate permit for the owner's trade? | open |
| Q-13 | F100's Owner Section has no mechanical box. For owner HVACR work, is F145's "Exempt Applicant" box enough, or do they want something written in? And who signs F370 when the owner replaces a fuel-fired appliance themselves? | open |
| Q-14 | What estimated cost goes on an owner-performed section: materials only, or materials plus the value of the labor? (A-27) | open |
| Q-15 | Do they follow the Electrical Board on two-family homes, i.e. can an owner living there do their own electrical? (A-23) | open |
| Q-16 | Can an owner who lives in a two-family home do their own plumbing or HVACR work? (A-26) Ask the Maplewood plumbing subcode official; for a definitive state answer, the Plumbing and HVACR Boards or DCA Code Assistance at (609) 984-7609, and whether the 2019 "License Check" answers still stand. | open |
