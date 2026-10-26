// What each askable fact and answer value means, in plain words. Sent to the
// question call so it can't misread a value name (the first eval worded
// `detached_2f` as "two stories"; it means a two-family house), and used for the
// built-in wording. Every fact the engine can ask about must be here (tests/ai.test.ts).

export interface Meaning {
  /** What the question is about. */
  asks: string;
  /** What each answer value means. Yes/no facts need none. */
  values?: Record<string, string>;
}

const FUEL = { gas: 'Natural gas', oil: 'Oil', propane: 'Propane', electric: 'Electric', none: "Burns no fuel (e.g. cooling only)" };

export const MEANINGS: Record<string, Meaning> = {
  // Property
  'property.dwelling_type': {
    asks: 'What kind of home this is (number of households, and whether it shares a wall with another home); not the number of stories',
    values: {
      detached_1f: 'Detached single-family house',
      detached_2f: 'Two-family house (two households)',
      attached: 'Attached single-family home that shares a wall (twin, townhouse, row house)',
      three_or_more_units: 'Building with three or more homes',
      non_residential: 'Not a home (commercial or other)',
    },
  },
  'property.owner_occupied': {
    asks: 'Whether the owner lives in the home',
    values: { yes: 'The owner lives there', immediate_family: "The owner doesn't, but their immediate family does", no: 'Neither (e.g. a rental)' },
  },
  'property.own_sewer': { asks: 'Whether this attached home has its own sewer connection, not shared with the neighbor' },
  'property.year_built': { asks: 'The year the house was built' },

  // Finishes and walls
  'finishes.element': {
    asks: 'What is being replaced',
    values: {
      cabinets: 'Cabinets', vanity: 'Vanity', countertops: 'Countertops', bath_accessories: 'Bath accessories (towel bars, mirrors, etc.)',
      flooring: 'Flooring', paint: 'Paint', wallpaper: 'Wallpaper', trim: 'Trim or molding', wall_tile: 'Wall tile',
    },
  },
  'drywall.material': { asks: 'What the walls are covered with', values: { drywall: 'Drywall', plaster: 'Plaster', paneling: 'Paneling' } },
  'wall_change.action': { asks: 'Whether the wall is removed or moved', values: { remove: 'Removed', move: 'Moved to a new spot' } },
  'opening.opening': { asks: 'What goes in the opening', values: { window: 'A window', exterior_door: 'An exterior door', interior_door: 'An interior door' } },
  'drywall.extent': {
    asks: 'How much of the wall area gets new drywall or plaster',
    values: { under_25_percent: 'Less than a quarter of the wall area', '25_percent_or_more': 'A quarter of the wall area or more' },
  },
  'wall_change.bearing': { asks: 'Whether the wall carries load from above (load-bearing)' },
  'opening.action': {
    asks: 'Whether the window or door opening in the wall changes',
    values: { replace_same: 'Same opening, unchanged (window or door replaced in it)', new: 'A new opening where there was none', enlarge: 'An existing opening made bigger' },
  },

  // Plumbing
  'fixture.action': {
    asks: 'Whether the fixture stays where the old one was, is an extra one, or moves (its drain or supply lines move)',
    values: {
      replace_same: 'Replaces the old one in the same spot, same piping',
      add: "An extra fixture where there wasn't one, piping in the existing space",
      relocate: 'Moves to a different spot (the drain or supply lines are rerouted)',
    },
  },
  'fixture.upsizing_needed': { asks: 'Whether the water lines or drain must be made bigger for this work' },
  'piping.like_capacity': { asks: 'Whether the new piping is the same size as the old' },
  'new_bathroom.ejector_pump': { asks: 'Whether the new bathroom needs a sewage ejector pump (the fixtures are below the main drain)' },
  'new_bathroom.upsizing_needed': { asks: 'Whether the water lines or drain must be made bigger for the new bathroom' },

  // Electrical and appliances
  'electrical.action': {
    asks: 'Whether the electrical work only replaces existing outlets, switches or lights like-for-like, or adds new ones',
    values: { replace_same: 'Only replaces existing ones like-for-like', add: 'Adds new outlets, switches, lights or circuits' },
  },
  'electrical.devices': { asks: 'How many outlets, switches and light fixtures the work installs in total (one number)' },
  'electrical.new_circuit': {
    asks: 'Whether the work needs a new circuit from the panel, and what for',
    values: {
      none: 'No new circuit: it runs on existing circuits',
      appliance: 'A new circuit only for a range, oven, dryer or air conditioner',
      other: 'Any other new circuit (e.g. counter outlets, lights, a heated floor)',
    },
  },
  'electrical.equipment': {
    asks: 'Whether the electrical work powers a piece of equipment, and what',
    values: { none: 'No equipment: outlets, switches and lights only', radiant_floor_heat: 'Electric radiant floor heat', other: 'Other equipment' },
  },
  'appliance.appliance': { asks: 'Which appliance', values: { range: 'Range', oven: 'Wall oven', cooktop: 'Cooktop', dryer: 'Clothes dryer' } },
  'appliance.fuel': { asks: 'What the appliance runs on', values: { gas: 'Gas', electric: 'Electric' } },
  'appliance.fuel_change': { asks: 'Whether it switches between gas and electric' },
  'appliance.gas_line_change': { asks: 'Whether the gas piping is new, moved or made bigger' },
  'appliance.electrical_change': { asks: "Whether the appliance's wiring is new or changed" },
  'range_hood.action': { asks: 'Whether the hood replaces an existing one or is new where there was none', values: { replace: 'Replaces an existing hood', new: 'New, where there was no hood' } },
  'range_hood.cfm': { asks: "The new hood's airflow rating in cfm (one number)" },
  'range_hood.cfm_increase': { asks: 'Whether the new hood is more powerful (higher cfm) than the old one' },
  'exhaust_fan.action': { asks: 'Whether the fan replaces an existing one or is new where there was none', values: { replace: 'Replaces an existing fan', new: 'New, where there was no fan' } },
  'exhaust_fan.vents_outdoors': { asks: 'Whether the fan vents directly outdoors' },
  'exhaust_fan.cuts_framing': { asks: 'Whether installing the fan or its duct means cutting joists, studs or rafters' },
  'smoke_co_alarm.power': {
    asks: 'How the smoke and CO alarms are powered',
    values: { hardwired: 'Hardwired to the house wiring', battery: 'Battery only', plug_in: 'Plug-in' },
  },
  'smoke_co_alarm.count': { asks: 'How many smoke/CO alarms are installed (one number)' },

  // Basement
  'habitable_space.bedroom': { asks: 'Whether any finished room will be used as a bedroom' },
  'habitable_space.fuel_appliance_nearby': { asks: 'Whether a furnace, boiler or water heater is in or right next to the finished rooms' },
  'insulation.type': { asks: 'What kind of insulation', values: { non_foam: 'Not foam (fiberglass, mineral wool, etc.)', foam: 'Foam (spray foam or foam board)' } },

  // Roof and exterior
  'roof_covering.existing_layers': { asks: 'How many layers of roofing are on the roof now', values: { one: 'One layer', two_or_more: 'Two or more layers' } },
  'roof_decking.rafters_touched': { asks: 'Whether any rafters, joists or other roof framing are repaired or replaced' },
  'skylight.count': { asks: 'How many skylights (one number)' },
  'siding.material': { asks: 'What the new siding is made of', values: { polypropylene: 'Polypropylene (plastic shake or shingle siding)', other: 'Anything else (vinyl, fiber cement, wood, etc.)' } },

  // HVAC
  'hvac_equipment.equipment': {
    asks: 'What kind of heating or cooling equipment',
    values: { furnace: 'Furnace', boiler: 'Boiler', ac_condenser: 'Central A/C condenser', heat_pump: 'Heat pump', mini_split: 'Ductless mini-split' },
  },
  'hvac_component.component': {
    asks: 'Which part of the heating or cooling system is being replaced',
    values: { thermostat: 'Thermostat', controls: 'Controls', motor: 'Motor', pump: 'Pump', fan: 'Fan', ac_repair: 'A/C repair' },
  },
  'hvac_equipment.action': { asks: 'Whether the equipment replaces existing equipment or is new where there was none', values: { replace: 'Replaces existing equipment', new: 'New, where there was none' } },
  'hvac_equipment.like_capacity': { asks: 'Whether the new equipment is the same size (capacity) as the old' },
  'hvac_equipment.fuel_change': { asks: 'Whether the fuel changes (e.g. oil to gas)' },
  'hvac_equipment.fuel': { asks: 'What the equipment runs on after the work', values: FUEL },
  'hvac_equipment.same_location': { asks: 'Whether the new unit goes in the same spot as the old one' },
  'hvac_equipment.cuts_framing': { asks: 'Whether the work cuts joists, studs or rafters (holes for line sets or vents don\'t count)' },
  'water_heater.action': { asks: 'Whether the water heater replaces an existing one or is new', values: { replace: 'Replaces an existing water heater', new: 'New, where there was none' } },
  'water_heater.like_capacity': { asks: 'Whether the new water heater is the same size as the old' },
  'water_heater.fuel_change': { asks: 'Whether the fuel changes (e.g. gas to electric)' },
  'water_heater.fuel': { asks: 'What the water heater runs on after the work', values: FUEL },
  'ductwork.action': {
    asks: 'Whether the ductwork is repaired or replaced as it is, or extended with new runs or registers',
    values: { repair_replace: 'Repaired or replaced as it is', extend: 'Extended: new runs or registers' },
  },
  'ductwork.fuel': { asks: 'What the heating system the ducts serve runs on', values: FUEL },
  'hydronic_piping.action': {
    asks: 'Whether the heating pipes or radiators are repaired or replaced in place, or rearranged',
    values: { repair_replace: 'Repaired or replaced in place', rearrange: 'Rearranged: pipes moved or zones added' },
  },
  'chimney_vent.action': {
    asks: 'What the chimney or vent work is',
    values: { new: 'A new chimney or vent', modify: 'Changes to an existing chimney or vent', direct_vent_conversion: 'Converting to a direct vent through the wall', liquid_liner: 'A poured (liquid) chimney liner' },
  },
  'chimney_vent.new_penetration': { asks: 'Whether the work makes a new hole through a wall or roof' },
};

/** The meaning for a question: by `<kind>.<fact>` for work items, `property.<fact>` for the property. */
export const meaningFor = (kind: string | null, fact: string): Meaning | undefined => MEANINGS[`${kind ?? 'property'}.${fact}`];
