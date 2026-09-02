# PF Precheck

**Live: https://pf-precheck.vercel.app** — opens straight into the product.
**No UAN. No OTP. No login. No demo credentials to type.** The journey starts on the
first screen you land on.

Built for **Build What Moves India**. Independent prototype, not affiliated with or
endorsed by EPFO. All claim data is synthetic.

---

## The member is not short of information. They are short of leverage.

Every other tool in this space helps a member *avoid* a rejection. That matters, and
this does it too. But it leaves untouched the thing that actually grinds people down:
the claim that is simply sitting there, with nobody accountable and nothing to point
at.

EPFO already promised to settle a complete claim in **twenty days**, in its own
Citizens' Charter. An unjustified delay past that already attracts **12% penal
interest, recoverable from the responsible official** rather than from the
department. Almost no member is ever told either fact.

PF Precheck counts your claim against that limit, names the role holding your file,
computes what the delay is worth **to you, in rupees**, and writes the grievance that
says so.

---

## What to try, in about 60 seconds

Reviewer path. Nothing to log into.

1. Open **https://pf-precheck.vercel.app** and click **Open PF Precheck**
2. Choose **"I applied, money has not come"**
3. **About a month ago** → **Submitted at portal**
4. The verdict: **day 27 of a 20-day limit, 7 days late**, and the role holding the
   file — a Dealing Assistant in the field office claims section, not "EPFO"
5. **What this delay is worth, on your claim: ₹276.** 12% a year on a ₹1,20,000 claim
   for 7 days, recoverable from the responsible official
6. Scroll to **What to do now** — EPFiGMS and RTI are open; CPGRAMS is visibly locked
   until day 45, because filing early gets it rejected as premature
7. **Draft the grievance** — the rupee figure is already in the letter, stated as the
   member's own calculation with a request that it be verified
8. Toggle **हिंदी** — the advice and the drafted documents change, not only the labels
9. Press **बड़े अक्षर / Bigger text** twice — nothing breaks
10. Then **/proposal** — what EPFO should return instead of a sentence

---

## Why the accessibility work is not decoration

The median EPF member is not the person who enjoys a dashboard. So the default view
asks one question at a time in large type, reads itself aloud, and scales twice
without breaking the layout.

Hindi is complete — advice, verdicts and generated documents, not only button
labels — and it is written in plain spoken Hindi rather than the Sanskritised
register the official forms use. A translation in the same register does not help
someone who could not read the original.

And there is no login. A member who cannot get past a UAN and an OTP never reaches
any of it.

---

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

## How the models are used

Built with Codex throughout. At runtime two OpenAI models do two narrow jobs.

| Model | Job |
|---|---|
| `gpt-4o-transcribe` | Hears a member describing their situation in any Indian language |
| `gpt-4.1-mini` | Maps an unrecognised rejection remark onto a structured payload, and routes spoken input to the right journey |

The rejection decoder is the one place a model earns its keep. The proposal in
this project is that EPFO should stop returning free text and start returning a
structured payload: `rule_id`, `required_value`, `actual_value`, `remedy_code`,
`responsible_owner`, `appeal_by`. Until it does, something has to turn the free
text into that shape, and the remarks arrive in an unbounded number of phrasings
across offices.

**Known patterns are matched deterministically first.** A member deciding what to
do deserves the same answer every time they ask. The model is asked only about
text the rule table does not recognise, and its output is validated into the same
contract before it is shown. Every check carries `RULE_SET_VERSION`, so an answer
can be traced to the revision that produced it.

Without an API key the route returns the deterministic result and says so on
screen. It never presents a template as model output.

## Running it

```bash
npm install
npm run dev
```

Voice input and the rejection decoder need an OpenAI key. The claim clock, the
20-day charter check, the penal interest calculation and the grievance drafter all
run without one.

```bash
OPENAI_API_KEY=sk-...
```

This app builds with `vinext` rather than the Next.js CLI. Deploying to Vercel
uses `node scripts/build-vercel.mjs`, which emits Build Output API v3 directly so
Vercel does no framework inference.

## Tests

```bash
npm test    # node --test over app/lib/*.test.ts
```

## Licence

MIT. See [LICENSE](LICENSE).
