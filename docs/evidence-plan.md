# Evidence plan: is the single-trade contractor the bigger user?

Prepared 2026-10-29, between M4 and M5. Source of the question: `product-brief.md`, Key risks ("The single-trade contractor may be the bigger user"). No rules, test jobs or expected answers are changed by this plan. Anything the construction office answers goes in later as a rules addendum, with owner approval.

Three pieces: an OPRA request (§1), a contractor interview guide (§2), and the questions for the Maplewood Construction Office (§3). Results go in §4.

## 1. OPRA request

Addressed to the Township Clerk (Maplewood's records custodian). Check the township website for the custodian's name and submission method before sending. Bracketed items are for the owner to fill in.

> **Subject: OPRA request: residential construction permit records, 1/1/2025 to 12/31/2025**
>
> Under the Open Public Records Act (N.J.S.A. 47:1A-1 et seq.), I request the following records from the Maplewood Construction Office:
>
> 1. The permit log, register or report (whatever the office keeps) of all **building, electrical, plumbing, fire and mechanical/HVAC** permit applications for **residential properties** received from January 1, 2025 through December 31, 2025.
> 2. For each permit, if recorded: permit number, subcode (building, electrical, plumbing, fire, mechanical), date filed, property address (street only), work description or work type, estimated cost, status, and the **applicant/contractor's business name and license type** (for example electrical contractor, plumbing contractor, HVACR, home improvement contractor).
>
> I do not need owner names, phone numbers, emails or signatures. Please redact those if they are in the records.
>
> I ask for the records **electronically, as a spreadsheet or CSV if available**, otherwise as a PDF, by email to [email]. If the records are only on paper, please tell me the copy cost before producing them. If any part of this request is denied, please cite the specific exemption and release the rest. I'm requesting this for [short, honest purpose; OPRA doesn't require one, so this sentence can be dropped].
>
> [Name, mailing address, phone, email]

**Fallback** if the office says it keeps no log: ask for the permit applications themselves, with the same redactions, for one sample month (about 20 to 40 files), and tally by hand.

### Counting rule (agreed 2026-10-29, fixed before seeing the data)

A **job** is the set of permits at one address within 90 days.

- **Trade-only:** the job has one subcode, and the applicant is a licensed trade contractor.
- **GC job:** the job has a building permit, or the applicant is a home-improvement contractor.
- **Unclear:** everything else. Report its count; don't fold it into either group.

Don't change the rule after the data arrives. If it turns out not to fit the records, say so in §4 and record the new rule as a separate, labelled second count.

## 2. Interview guide

2 to 3 contractors, about 30 minutes each. At least one single-trade contractor (HVACR, electrician or plumber working alone) and one general contractor. Don't pitch the product first. This doubles as M5's contractor feedback.

**A. Their work (5 min, everyone)**
1. Last 10 jobs that needed a permit: how many did you pull the permit yourself? How many did a GC or the homeowner pull?
2. Who signs what on those: your trade section, the F100, the owner authorization?
3. How many were Maplewood? Which other towns?

**B. Today's process (10 min, everyone)**
4. Walk me through the last Maplewood permit, from "customer says yes" to "permit in hand." Where did you lose time or get sent back?
5. What do you look up each time (forms, parcel/lot data, license numbers, who to call)?
6. Last time the office rejected or questioned a packet, what was the reason?

**C. Show the packet (10 min)**
Hand over a printed packet or run the app on a job like theirs: J-01 for a GC, J-08 or a mini-split case for a trade contractor. Ask them to describe a real job aloud, then watch.
7. What did you expect to see that isn't here? What's here that you wouldn't use?
8. Is the cover checklist what you'd want? The scope narrative? Would you sign this section as filled in?
9. Time them if they'll let you (M4's J-01 took about 3 minutes).

**D. Rules checks, only where relevant (3 min)**
10. *Trade contractor:* Do you register as a home improvement contractor (HIC) for jobs within your license? (LC-01)
11. *HVACR:* On a straight A/C or furnace swap, who actually signs F120 today? Who does the electrical hookup on a new mini-split? (Q-3)
12. *GC:* Do your subs sign their own technical sections, or does your office fill them in?

**E. Close (2 min)**
13. Would you use this on the next job? What would stop you? What would you pay or trade for it?
14. Who else files permits like you do that I should talk to?

Log each answer in §4 under keep / change / drop, in the contractor's own words, during or right after the call.

## 3. Questions for the Maplewood Construction Office

All open items from `rules-table-v1.md` §6, plus LC-01, in one contact. Ordered by how much they bear on the single-trade question. Also ask which permit records they can export, so the OPRA request matches what exists.

**Highest priority (single-trade)**
- **Q-3.** On a like-for-like A/C or furnace swap that reconnects to the existing dedicated disconnect (25 tons or less, 240 volts or less; N.J.A.C. 13:32A-1.2 and 1.3), is an F120 needed at all? If so, who signs: an electrician or the HVACR contractor?
- **LC-01** (open in the brief; not numbered in §6). Do licensed trade contractors working within their license need HIC registration to apply?
- **Q-13.** For owner HVACR work, is F145's "Exempt Applicant" box enough, or do they want something written in? Who signs F370 when the owner replaces a fuel-fired appliance?
- **Q-11.** F100 has no Mechanical row in §IIb. Where do they want the cost of F145 work: the Plumbing row, or written in?

**Plans and technical requirements**
- **Q-2.** When is an unsealed contractor sketch accepted (wall moves, basement finish), and when must plans be sealed?
- **Q-4.** F370 on every fuel-fired replacement? F390/F392 on basement finishes?
- **Q-5.** Plumbing riser diagram for relocated or added fixtures?
- **Q-6.** Make-up air for range hoods over 400 cfm: what do they need to see?
- **Q-7.** Minimum ceiling height they enforce for finished basements.
- **Q-8.** Hardwired interconnected smoke/CO alarms when a basement is finished?
- **Q-10.** Manual J load calculation for new or resized HVAC?

**Homeowner trade work**
- **Q-12.** When the owner does one trade and a contractor does the rest: one application with the owner as applicant, or a separate permit for the owner's trade?
- **Q-14.** Estimated cost on an owner-performed section: materials only, or materials plus the value of the labor?
- **Q-15.** Do they follow the Electrical Board on two-family homes (can an owner living there do their own electrical)?
- **Q-16.** Can an owner who lives in a two-family home do their own plumbing or HVACR? Ask the plumbing subcode official. For a definitive state answer: the Board of Examiners of Master Plumbers, the HVACR Board (Division of Consumer Affairs), or DCA Code Assistance at (609) 984-7609, and whether the 2019 "License Check" answers still stand.

## 4. Results

### OPRA request

| Item | Result |
|---|---|
| Date sent | |
| Date answered | |
| Format received | |
| Permits in file | |
| Trade-only jobs | |
| GC jobs | |
| Unclear | |
| Notes on fit of the counting rule | |

### Interviews

| Date | Contractor (role, trade) | Jobs permitted per year, share self-filed | Keep | Change | Drop | Rules answers (LC-01, Q-3) |
|---|---|---|---|---|---|---|
| | | | | | | |

### Construction office answers

| Question | Answer (their words) | Date | Who |
|---|---|---|---|
| | | | |

### Conclusion

Do trade-only jobs dominate? If yes: revise the brief's primary user and write a rules addendum (brief, Next steps 3). If no: plan M5 as polish from the feedback above.

*(to be written once the evidence is in)*
