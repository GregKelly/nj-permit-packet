# Research notes

Sources and findings gathered during product definition (October 2026). Verify anything marked *unconfirmed* before relying on it.

## Forms (NJ DCA)

- Construction permit packet and forms index: https://www.nj.gov/dca/codes/resources/constructionpermitforms.shtml
- F100 Construction Permit Application (jacket): https://www.nj.gov/dca/codes/forms/pdf_ucc_stdforms/ucc_f100_cpa.pdf
- Subcode technical sections include F110 Building, F120 Electrical, F130 Plumbing, F140 Fire Protection; check the index for current versions and any mechanical/elevator sections.
- Governing code: N.J.A.C. 5:23 (Uniform Construction Code), including the Rehabilitation Subcode and the ordinary-maintenance and minor-work provisions (5:23-2.7). Permit application requirements are in 5:23-2.15.
- Signatures: a DCA rule adoption says plan signatures under 5:23-2.15(b)2iii must be ink (wet) signatures, applying to F130 and F145. https://www.nj.gov/dca/codes/codreg/pdf_rule_adoptions/omni_2026_adopt.pdf
- Who signs the trade sections is *unconfirmed* officially. A secondary source says licensed plumbers sign F130 unless the applicant is an exempt homeowner (https://www.permitflow.com/blog/plumbing-permit-nj), and not all plumbing work needs a master plumber's license.

## Maplewood, NJ

- Permit applications page: https://www.maplewoodnj.gov/government/community-development/permit-applications
- Land use administration: https://www.maplewoodnj.gov/government/community-development/land-use-administration
- Fee schedule (municipal code): https://ecode360.com/9419720#27674060
- Zoning permit (Ch. 271) is a "condition precedent to the commencement of a use or erection, construction, reconstruction, alteration, conversion or installation of a structure or building." The residential zoning application needs the application form, a survey drawn to scale showing the work, a $50 fee, and an impervious coverage calculation. The Zoning Officer replies in writing: proceed as of right, or needs Planning/Zoning Board approval. https://maplewoodnj.gov/home/showpublisheddocument/278/638603715974900000
  - **v1 assumption:** purely interior alterations don't need a zoning application (configurable).
  - Zoning Division: 973-762-8120 ext. 5602.
- Town tax/property lookup (Edmunds WIPP): https://wipp.edmundsgovtech.cloud/home?wippId=0711. Superseded for our purposes by the statewide parcel service below.
- Maplewood publishes no plan-review checklist.

## Address → block/lot (verified working 2026-10-22)

- NJOGIS statewide parcels with MOD-IV attributes: https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services/Parcels_Composite_NJ_WM/FeatureServer/0
- Useful fields: `MUN_NAME` (e.g. "MAPLEWOOD TWP"), `PROP_LOC` (address), `PCLBLOCK`, `PCLLOT`, `PCLQCODE` (qualifier), `PROP_CLASS` (2 = residential), `COUNTY`, `YR_CONSTR`, `BLDG_DESC`.
- Example query (JSON, no geometry):
  `.../FeatureServer/0/query?where=MUN_NAME LIKE '%MAPLEWOOD%' AND PROP_LOC LIKE '%VALLEY ST%'&outFields=PROP_LOC,PCLBLOCK,PCLLOT,PCLQCODE,PROP_CLASS&returnGeometry=false&f=json`
  Result example: 505 VALLEY STREET → Block 16.02, Lot 90, class 2.
- Caveats:
  - Address formats are inconsistent ("ST" vs "STREET", ranges like "489-91"), so normalize and show the match for the user to confirm.
  - At most 2000 records per query.
  - `OWNER_NAME` is redacted (Daniel's Law), so owner details come from the contractor.
  - Parcel shapes aren't legal boundaries.
- Field definitions (checked 2026-10-27). The service itself defines no fields; its attributes come from the Treasury's MOD-IV tax list, defined in NJ Division of Taxation, "MOD IV" field descriptions: https://www.nj.gov/treasury/taxation/pdf/lpt/MODIVLayoutandDescrip.pdf (status key: M = mandatory, O = optional, * = rarely used). The NJOGIS metadata page for the composite (`.../digidownload/metadata/html/Cad_parcel_mod4.html`) now returns 404.
  - `PROP_LOC`: "PROPERTY LOCATION (M): This is the actual street address of the parcel." Street only; no town or ZIP.
  - `ST_ADDRESS`, `CITY_STATE`, `ZIP_CODE` (and `ZIP5`): the owner's mailing address. "ZIP CODE (M): This field should list the Zip Code of the current owner(s)." Example: 21 Nelson Place, Maplewood (block 45.03, lot 126) lists 52 Wootton Road, Essex Fells, 07021. **The record has no ZIP for the property itself**, so the work-site ZIP comes from the address the contractor enters.
  - `OWNER_NAME`: mandatory in MOD-IV but blank in this service (Daniel's Law). The owner's mailing street, town and ZIP are still present.
  - `DWELL`: "NUMBER OF DWELLINGS (O, *): This field indicates the number of residential dwelling units within the property." Optional and "rarely used" statewide, but filled in for all 6,851 Maplewood class 2 parcels: 1 unit 6,124; 2 units 631; 3 units 68; 4 units 28. It can't tell a detached house from a twin (each half is usually its own lot with 1 unit), and its accuracy is unchecked: 21 Nelson Place shows 4 units on a 46×100 lot.
  - `PROP_CLASS`: class 2 is "Residential"; the code doesn't separate one-family from multi-family. So class 2 alone doesn't establish rule SC-01's one- or two-family scope.
  - `BLDG_DESC`: "stories, exterior structural material, style, number of stalls and type of garage" (e.g. "2SF2G").
  - `YR_CONSTR`: "the year the building was constructed" (optional).

## Homeowner trade work (researched 2026-10-26)

- UCC general exception, N.J.A.C. 5:23-2.15(b)2.i ("except in the case of a single-family homeowner on his or her own dwelling"), (b)8.ii (owner needs no HIC registration), (d) (who may apply): https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-5-23-2-15
- DCA adoption of that wording, with the response that each trade's own law governs the exception: 52 N.J.R. 10(1), https://nj.gov/dca/codes/codreg/pdf_rule_adoptions/HVACR_adopt_2020_10_05.pdf
- **Key source.** "License Check," *Construction Code Communicator* Vol. 31 No. 1 (Spring 2019), pp. 6–7: the plumbing, HVACR and electrical boards' answers by home type and residency, as a chart. https://www.nj.gov/dca/codes/publications/pdf_ccc/CCC_Spr_2019.pdf
- Electrical, N.J.S.A. 45:5A-18(n) (dwelling occupied solely as a residence for the person or immediate family): https://law.onecle.com/new-jersey/title-45/45-5a-18.html
- Plumbing, N.J.S.A. 45:14C-12.4: https://codes.findlaw.com/nj/title-45-professions-and-occupations/nj-st-sect-45-14c-12-4/ and N.J.A.C. 13:32-1.4(f)1: https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-32-1-4
- HVACR, N.J.S.A. 45:16A-9 (personally occupies, solely performs, no CFC/HCFC work): https://codes.findlaw.com/nj/title-45-professions-and-occupations/nj-st-sect-45-16a-9/ and N.J.A.C. 13:32A-1.1(b)3: https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-32A-1-1
- Town guidance (secondary): the owner must do the work personally; Ridgefield Park requires licensed trades for owner-occupied two-family homes, which conflicts with the Electrical Board. https://www.ridgefieldpark.org/node/46, https://veronanj.org/departments/buildingandzoning/BuildingFAQs
- *Unconfirmed:* the statute text above came from mirrors (onecle, FindLaw, LII), not the official sites. The NJ Electrical Board FAQ page (https://www.njconsumeraffairs.gov/elec/pages/faq.aspx) didn't load. Maplewood publishes nothing on homeowner trade work.

## HVACR contractors and electrical work (researched 2026-10-28, bears on Q-3)

Prompted by the owner's M4 review: can a licensed HVACR contractor working alone also do the electrical side?

- **The 30-volt limit is real.** N.J.A.C. 13:32A-1.3 ("Electrical work"): apart from replacement cases, a master HVACR contractor may not do electrical work above 30 volts. https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-32A-1-3
- **But there's a replacement exception.** The HVACR definition (N.J.A.C. 13:32A-1.2, item 10; N.J.S.A. 45:16A-2) lets the HVACR contractor, *in replacement cases only*, connect the wiring from an existing service disconnect previously dedicated to that equipment, if the equipment is 25 tons or less, the system is 240 volts or less, and the work follows the UCC. "Replacement" means the same or similar type of equipment. https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-32A-1-2 and https://codes.findlaw.com/nj/title-45-professions-and-occupations/nj-st-sect-45-16a-2/
- **What it means here.** New equipment that needs a new circuit or disconnect (J-09's new mini-split) needs a licensed electrician, which matches the approved J-09. For a like-for-like swap reconnected to the existing dedicated disconnect (J-08's furnace and A/C swap), the HVACR contractor may do the hookup. Still unanswered, so Q-3 stays open: whether the office then wants F120 at all, and if so, who signs it.
- *Unconfirmed:* the texts came from LII and FindLaw, not the official sites. The pages don't cover the Electrical Contractors law.
