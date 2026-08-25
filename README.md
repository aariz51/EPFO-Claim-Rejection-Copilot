# PF Precheck

PF Precheck is an independent hackathon prototype covering the whole EPF claim
lifecycle: before you file, while you wait, and after a rejection. It turns opaque
rules, fragmented records and unexplained delay into exact numbers with a named
owner, then carries the same diagnosis into decoded rejections and evidence-backed
grievance drafts.

**Three things a member can be stuck on, and this answers all three.**

| State | Question | What it does |
| --- | --- | --- |
| Before filing | Will this be rejected? | Exact-number readiness: required 60 months, actual 56, gap 4. |
| Waiting | Is it actually stuck? | Counts against EPFO's own 20 day Citizens' Charter limit, names the officer holding the file, and unlocks a day-gated escalation ladder. |
| Rejected | What does this even mean? | Decodes the remark into the structured contract EPFO should have returned. |

The waiting journey exists because it is the loudest pain right now. Member
services were suspended from 26 June to 3 July 2026 for the EPFO 3.0 migration,
EPFO advised claims could take two weeks longer than usual afterwards, and members
have been using public forums as a makeshift claim tracker ever since.

## The winning mechanism

The product compares three things that citizens cannot currently see together:

1. The claim rule and its effective version.
2. The passbook money trail.
3. The EPS service trail used during processing.

That comparison can explain a failure as `required: 60 months`, `actual: 56 months`, `gap: 4 months`, while also revealing that a transfer exists in the passbook but 38 months of pensionable service are absent from Service History.

The proposed backend contract replaces a generic free-text rejection with a structured payload containing `rule_id`, `required_value`, `actual_value`, `remedy_code`, `responsible_owner`, and `appeal_by`.

## Built for the member, not for a dashboard

Research on low-literacy users in India is blunt: in mobile banking tasks,
graphical interfaces reached 100% task completion where text-only interfaces
reached 0%. So the same engine has two front doors.

- **Simple mode**, the default. One question per screen, an icon and a sentence on
  every option, 64px targets, and the action always above the fold.
- **Read aloud**, in Hindi or English, using the browser's own speech synthesis so
  it costs nothing and works on a slow connection.
- **Three text sizes**, driven from one variable so every rule scales together.
- **Assisted mode**, because a CSC operator, an HR clerk or a son filling this in
  for a parent is the normal case. The wording changes from "your claim" to
  "their claim".
- **Hindi reaches the advice, not just the labels**, in plain spoken Hindi rather
  than the Sanskritised register the official forms use. A translation in the same
  register a member could not read in the first place helps nobody.
- **Detailed mode** is unchanged and one tap away, for HR staff and confident users.

## Where a model is actually used

One place. EPFO rejection remarks arrive in an unbounded number of phrasings
across offices, and mapping arbitrary text onto a structured rule is the one job
here a model does better than a rule table.

Known patterns are matched deterministically first, because a member deciding what
to do deserves the same answer every time they ask. The model is only asked about
text the rule table does not recognise, and its reply is validated into the
contract before a member sees it. Every result is labelled with its source:
matched a verified rule, decoded by an OpenAI model, or built-in fallback. Without
a key it degrades to the fallback and says so rather than passing a template off
as model output.

`POST /api/decode` returns exactly the payload this project argues EPFO should
return directly.

## Demo journey

- Ask what you are stuck on, in Hindi or English, read aloud if you want.
- Find out whether a waiting claim is actually late, who is holding it, and what
  the 12% penal interest lever is.
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

24 tests. The deterministic claim engine covers Form 31 service and amount rules,
active-employment blocks for Forms 19 and 10C, every supplied rejection pattern,
the safe fallback and grievance generation. The accountability clock covers
auto versus manual routing, the charter limit, the retirement of "wait" advice the
moment a claim goes late, penal-interest gating, ladder unlocking, the migration
window, working-day maths, and that switching to Hindi translates the advice while
the numbers stay identical.

## Rule provenance

- [EPFO Form 31 advance guidance](https://www.epfindia.gov.in/site_docs/PDFs/Downloads_PDFs/TypesOfAdvances_Form31.pdf)
- [EPFO Annexure K circular](https://www.epfindia.gov.in/site_docs/PDFs/Circulars/Y2025-2026/EPFOCircular_18092025_AnnexureK.pdf)
- [EPFO claims and grievance FAQ](https://www.epfindia.gov.in/site_en/FAQ.php)
- [EPFO Citizens' / Clients' Charter](https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/CitizenCharter.pdf) for the 20 day settlement limit and the 7 working day grievance limit
- [Official EPFiGMS portal](https://epfigms.gov.in/)

## Honesty boundary

All member records, identifiers, balances, field-office states, and outcomes in
this prototype are synthetic. The day counts in the waiting journey are computed
from a date you choose, not read from any live claim. Government API access, automatic grievance submission, rule ingestion, and legal sign-off are mocked or proposed. Production rules must be versioned, linked to the exact official paragraph, and reviewed before activation.
