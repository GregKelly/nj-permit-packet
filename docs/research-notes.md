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
