# Permit Packet — Product Brief

*Working name · v1 concept · October 2026 · Owner: Gregory Kelly*

> Permit Packet turns a contractor's plain-language job description into a complete, print-ready New Jersey construction permit packet, with every requirement explained, so applications go in right the first time.

---

## The problem

Small residential contractors in New Jersey file construction permits on almost every job. The permit is required to deliver the project, but it isn't the project. The work usually falls to the contractor or an office manager. They fill out the UCC permit jacket (F100) and the subcode technical sections on paper, collect signatures, then hand-carry them to the local construction office.

Typing is the easy part. The costly parts are judgment calls and coordination that are easy to get wrong:

- **What kind of work is this?** Is it a repair, an alteration, or minor work? Does it need a permit at all?
- **Which forms are needed?** A kitchen remodel can touch the building, electrical, plumbing and fire subcodes.
- **Who has to sign what?** The property owner signs or authorizes the application, and licensed trades may need to complete and sign their own sections.
- **What must come first?** In Maplewood, a zoning permit is a condition of starting construction work. It needs its own application, a property survey and a fee, and the construction office won't process an incomplete package.
- **How should the work be described?** The description has to tell a plan reviewer exactly what's being done, with nothing left to question.

When any of these goes wrong, the application is rejected or draws requests for more information, which delays the job and costs the contractor time they don't bill for. The non-software alternative is to pay someone who already knows the process. Contractors charge homeowners about **$75 for roughly an hour** of permit paperwork, and that's the bar this product has to beat.

## Who it's for

**Primary user:** a small residential contractor, or their office manager, who files permits regularly.
**Secondary users:** the property owner, who signs the authorization, and licensed subcontractors, who supply license details and sign their sections.
**Starting market:** Maplewood, NJ.

## Constraints

- **Paper submission.** The packet is printed and hand-delivered; there's no electronic filing in v1.
- **Rules come only from public sources.** Maplewood publishes no review checklist, so requirements must come from the state code, DCA guidance, and Maplewood's zoning rules.
- **Signatures are physical.** Owner and licensed-trade signatures are ink on paper, so the product can prepare them but not collect them.
- **The applicant is responsible.** The applicant signs and certifies the application. The product prepares it and explains its reasoning, but doesn't replace their judgment.

## The outcome we want

A contractor turns a plain-language job description into a **complete, accurate, review-ready permit packet in under 10 minutes**. The packet reflects the real project and goes through municipal review without avoidable rejections or follow-up requests.

## Solution shape

**Core insight:** Applications fail on upstream decisions, not on the form: the work classification, which sections apply, which approvals come first, and who must sign. So the product makes every one of those decisions explicit, with its reason, before it fills in a single field.

**Design principle:** AI interprets and writes. Rules decide. The contractor confirms.

1. **Set up once.** The contractor saves their business details (FEIN, HIC registration, licenses, insurance) and the license details of the subcontractors they regularly use.
2. **Describe the job.** The contractor enters the property address and a plain-language description. Block, lot and property class are filled in automatically from the state's public parcel records.
3. **Answer a few questions.** AI reads the description and asks only the follow-up questions that change what's required.
4. **Review the determinations.** Rules based on the NJ Uniform Construction Code decide the work type, required sections, zoning prior approval, and plan needs. Each determination shows its reason, and the contractor confirms it.
5. **Print the packet.** The packet contains:
   - the filled F100 and the required subcode sections
   - an owner authorization page
   - a reviewer-friendly scope of work
   - a cover checklist showing who signs where and what's still to attach (zoning approval, survey, plans)

**Process that goes with it:** The contractor still gets the zoning permit before submitting, collects the owner's and subcontractors' signatures, and hand-delivers the packet. The cover checklist turns that routine into a list nothing falls off.

### Key decisions

- **Contractor-first**, because contractors file most permits and file repeatedly. Homeowners filing their own permits are the edge case.
- **Each licensed subcontractor completes and signs their own technical section**, with details pre-filled from the saved directory. This is the safe assumption until confirmed with the construction office.
- **Address-only property lookup** uses statewide parcel data, so it will work for other NJ towns later without per-town websites.
- **Plans are flagged, not produced**, because sealed plans are professional work outside the product's scope.
- **Local rules are configuration, not code.** Town-specific requirements such as zoning triggers live in editable rule data, so a wrong assumption is a one-line fix and adding a town doesn't mean rewriting logic.

### v1 scope

| In | Out (for now) |
|---|---|
| Kitchen & bath remodels | Plans or drawings (flagged when needed) |
| Finished basements | Electronic submission |
| Roof replacement | Towns other than Maplewood |
| HVAC installation / replacement | Commercial projects |
| Zoning prior-approval check and checklist | Filling in the zoning application itself |
| Owner authorization page | Collecting signatures electronically |
| | Permit fee calculation (the office calculates fees) |

## What "done" looks like for v1

Across a test set of about 10 realistic jobs covering all four project types, including tricky and "no permit needed" cases:

- ✅ **The right forms every time.** The correct permit jacket and subcode technical sections are selected for every job.
- ✅ **No retyping.** Every contractor, subcontractor and property field that can be pre-filled is pre-filled.
- ✅ **The right flags.** Warnings about zoning, plans, missing registrations and "you may not need a permit" match what a knowledgeable permit expediter would raise.
- ✅ **Under 10 minutes.** A contractor goes from job description to printed packet in less than 10 minutes.
- ✅ **Every determination is explained.** Each requirement shows why it applies, so the user can check it rather than trust it blindly.

## Key risks & assumptions

- **Getting the rules right.** With no local checklist, the rules rest on state code and DCA guidance. Anything uncertain is shown to the user as an assumption.
- **Who signs the trade sections.** We assume licensed subcontractors complete and sign their own electrical and plumbing sections. If the general contractor's office can complete them, the flow gets simpler.
- **Zoning applicability.** Maplewood requires a zoning permit for construction and alteration work. v1 assumes purely interior alterations don't need one. That's unconfirmed, so the rule is kept as configuration that can be flipped without code changes.
- **Address matching.** Parcel records format addresses inconsistently (for example "ST" vs "STREET", or numbers written as ranges), so the lookup must show its match for the contractor to confirm.
- **Contractor workflow and trust.** We'll test adoption with real contractors once a working output exists.
- **The single-trade contractor may be the bigger user** (added 2026-10-28, owner's M4 review). A licensed trade contractor working alone, for example an HVACR company installing a mini-split, is the applicant and signs its own section, with no general contractor or subs. These jobs may outnumber renovations. M4 supports it in a small way (your own trade licenses in Setup); the primary user above is unchanged for now. Before M5: check what share of Maplewood residential permits are trade-only (permit records, possibly through an OPRA request) and talk to two or three contractors. If they dominate, revise this brief and write a rules addendum. Open rules questions: whether licensed trade contractors working within their license need HIC registration (LC-01), and who signs F120 for an HVAC equipment hookup (Q-3). State rules let an HVACR contractor do only 30-volt work, except reconnecting a like-for-like replacement to its existing disconnect (`docs/research-notes.md`, 2026-10-28). So a new mini-split still needs an electrician; a straight A/C or furnace swap may not.

## Next steps

1. Confirm with Maplewood's Construction and Zoning divisions:
   - whether interior remodels need a zoning permit
   - whether licensed trades must sign their own technical sections
2. Draft the v1 rules table for the four project types and review it.
3. Write about 10 realistic test jobs.
4. Build a working local prototype that produces a printed packet.
5. Show outputs to contractors and gather feedback.
