# PF Precheck

PF Precheck is an independent hackathon prototype for preventing avoidable EPFO claim rejections before a member submits. It turns opaque rules and fragmented records into an exact-number readiness report, then carries the same diagnosis into a rejection decoder and evidence-backed grievance draft.

## The winning mechanism

The product compares three things that citizens cannot currently see together:

1. The claim rule and its effective version.
2. The passbook money trail.
3. The EPS service trail used during processing.

That comparison can explain a failure as `required: 60 months`, `actual: 56 months`, `gap: 4 months`, while also revealing that a transfer exists in the passbook but 38 months of pensionable service are absent from Service History.

The proposed backend contract replaces a generic free-text rejection with a structured payload containing `rule_id`, `required_value`, `actual_value`, `remedy_code`, `responsible_owner`, and `appeal_by`.

## Demo journey

- Pre-check Form 31, Form 19, and Form 10C against a synthetic member record.
- See exact eligibility, amount ceilings, gaps, owners, and alternatives.
- Compare passbook and service timelines to expose an Annexure K sync failure.
- Decode realistic rejection remarks in English or Hindi.
- Generate, edit, copy, and download an EPFiGMS grievance draft.
- Inspect the proposed structured rejection API and the prototype honesty boundary.

## Run locally

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 3001
```

Open [http://localhost:3001](http://localhost:3001).

## Verification

```bash
npm test
npm run lint
npm run build
npm audit --omit=dev
```

The deterministic claim engine has focused coverage for Form 31 service and amount rules, active-employment blocks for Forms 19 and 10C, all supplied rejection patterns, the safe fallback, and grievance generation.

## Rule provenance

- [EPFO Form 31 advance guidance](https://www.epfindia.gov.in/site_docs/PDFs/Downloads_PDFs/TypesOfAdvances_Form31.pdf)
- [EPFO Annexure K circular](https://www.epfindia.gov.in/site_docs/PDFs/Circulars/Y2025-2026/EPFOCircular_18092025_AnnexureK.pdf)
- [EPFO claims and grievance FAQ](https://www.epfindia.gov.in/site_en/FAQ.php)
- [Official EPFiGMS portal](https://epfigms.gov.in/)

## Honesty boundary

All member records, identifiers, balances, field-office states, and outcomes in this prototype are synthetic. Government API access, automatic grievance submission, rule ingestion, and legal sign-off are mocked or proposed. Production rules must be versioned, linked to the exact official paragraph, and reviewed before activation.
