# PF Precheck - submission pack

Deadline: 28 August 2026, 8:00 PM IST. No grace period.

Live: **https://pf-precheck.vercel.app**
Repo: **github.com/aariz51/EPFO-Claim-Rejection-Copilot**
Demo video: **https://youtu.be/Ijr-enVju88** (unlisted, anyone with the link can watch)
Proposal page: **https://pf-precheck.vercel.app/proposal** (what EPFO should return)
250-word summary: see `~/buildwhatmovesindia-research/SUMMARIES-250-WORDS.md`

---

## Project summary

EPFO members filed 796 lakh claims last year and 174 lakh were rejected, roughly
one in five. Final-settlement rejections rose from 13% to 34% in five years. The
reason a member gets back is often two words, "insufficient service", with no
number attached, so they reapply blind and get a different two words.

PF Precheck covers the whole claim lifecycle in one place. Before filing, it runs
the rules and reports the gap as numbers: required 60 months, you have 28, short
by 32. While waiting, it counts against EPFO's own Citizens' Charter limit of 20
days, names the officer holding the file at each stage, and surfaces the lever
almost nobody knows about, that an unjustified delay past the limit attracts 12%
penal interest recoverable from the responsible official. Past that line the
advice changes: waiting disappears, and a grievance, an RTI at ten rupees and
CPGRAMS unlock in order.

After a rejection, the decoder turns any remark into a structured result. Known phrasings match a deterministic rule table, so the answer never
varies. Only unrecognised text reaches an OpenAI model, whose reply is validated
before a member sees it, and the source is always labelled.

That contract is the real proposal: EPFO should return rule_id, required_value,
actual_value and remedy_code directly, instead of a sentence a member has to
decode.

Simple mode is the default, one question per screen, in Hindi or English, with
the advice translated and not just the labels. Synthetic records throughout.

---

## Submission checklist

- [x] Live public link, opens without requesting access
- [x] Built with Codex, and powered by an OpenAI model at runtime
- [x] Summary under 250 words
- [x] Video uploaded for a public URL (1:37, https://youtu.be/Ijr-enVju88)
- [ ] Partner's registered email, or blank if solo
- [x] No real Aadhaar, PAN, OTP, card or payment data anywhere

## The Codex answer

This project was scaffolded and built with Codex, so the Codex-contribution
question is answerable directly here. It is also powered by an OpenAI model at
runtime:

> The rejection decoder is powered by an OpenAI model. Rejection remarks arrive
> in an unbounded number of phrasings across field offices, so known patterns are
> matched deterministically first and only unrecognised text reaches the model,
> whose reply is validated into a fixed contract before it is shown. Every result
> is labelled with its source. `app/api/decode/route.ts`

Verify before submitting: paste an unusual rejection remark and confirm the chip
reads "Decoded by an OpenAI model" rather than "Built-in fallback".

## Verification

    npm test        24 tests
    npm run lint
    npm run build

## Deploying

Vercel detects `next` and expects `.next/routes-manifest.json`, which vinext
never writes. Build the output directly and deploy prebuilt:

    npm run build:vercel
    # then from a git-free copy of .vercel/output, because Vercel blocks the
    # deploy on the git author not being on the team:
    vercel deploy --prebuilt --prod --global-config ~/.vercel-accounts/rashiqxd
