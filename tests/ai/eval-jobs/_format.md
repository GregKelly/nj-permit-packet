# Eval-only descriptions (docs/eval-jobs-m3.md, approved 2026-10-26)

Each file is one description. Item ids are the AI's own, so items are found by
`match` (kind and facts); every item that matches is checked, and at least one
must exist unless the entry says `optional: true`.

- `items.<name>.unknown`: facts that must stay `unknown` (a value is a guessed fact)
- `items.<name>.facts`: facts that must have this value (another value is wrong; `unknown` is missed)
- `costs`: amounts that must be extracted; `null_costs`: costs that must stay null
- `property.unknown` / `property.facts`: as for items
- `performed_by`: who must do a trade (`owner`); `not_owner`: trades the owner must not be marked as doing
- `named`: a name that must be returned for a trade, and the directory key it must match (null: no match)
- `not_covered`: words that must appear in a "not covered" entry
- `follow_ups`: a question the engine must ask in round 1 (found by item `match` and `fact`, or by `key`),
  and words its quote must contain
