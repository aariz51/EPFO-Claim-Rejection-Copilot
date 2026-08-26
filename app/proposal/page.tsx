
/**
 * The system proposal.
 *
 * Everything else in this product is a workaround. It exists because EPFO
 * returns a sentence where it should return a record, and because nobody tells
 * the member what the clock on their claim is. This page states what should
 * change instead, written for whoever would have to implement it.
 *
 * Deliberately not a marketing page. No hero, no gradient. It is a spec.
 */

export const metadata = {
  title: 'What EPFO should return | PF Precheck',
  description:
    'The four changes that would make this product unnecessary, written as a spec rather than a pitch.',
};

const MODEL_ROLES = [
  {
    job: 'Decoding a rejection remark the rule table does not recognise',
    model: 'gpt-4.1-mini',
    live: true,
    today:
      'Live in the product now. Known phrasings never reach it, so the common answers never vary. What does reach it comes back validated into a fixed schema before a member sees it, and the screen says which of the two answered you.',
    cost: 'about 10 paise per decode',
  },
  {
    job: 'Understanding what the member said, instead of making them choose',
    model: 'gpt-4o-transcribe',
    live: false,
    today:
      '"Paisa nahi aaya, do mahine ho gaye" should resolve to the waiting journey with a filing date already set. Code-mixed Hinglish is the normal case for this audience, not the edge case, and a menu of buttons cannot survive it.',
    cost: 'about 25 paise per claim',
  },
  {
    job: 'Reading the verdict and the grievance aloud',
    model: 'gpt-4o-mini-tts',
    live: false,
    today:
      'The browser speech engine ships because it is free and works offline. On the cheap Android handsets that matter most here it reads Devanagari with a Latin voice, and for a member who cannot read the explanation that is the difference between the product working and not.',
    cost: 'about 2 rupees per verdict',
  },
  {
    job: 'The advice and the drafted documents in more Indian languages',
    model: 'gpt-5-mini, generated once at build time',
    live: false,
    today:
      'English and Hindi are complete, including the advice and the generated grievance. Six further languages are named as pending rather than shipped unverified: a confidently wrong sentence in a legal document is worse than no sentence, and we cannot read Tamil or Kannada well enough to check one. Generated at build time, runtime cost is zero and it cannot fail on a bad connection.',
    cost: 'single digit rupees, once',
  },
];

const CHANGES = [
  {
    n: '01',
    title: 'Return the rejection as a record, not a sentence',
    today:
      'A member whose claim is rejected receives a free text remark entered by a dealing assistant. "Insufficient service" and "wage details not tallying with ECR" are typical. They contain no number, no rule reference and no instruction, so the member reapplies blind and gets a different sentence.',
    change:
      'Keep the free text field exactly as it is. Add a structured object beside it. Make it mandatory only for the twenty most common reasons in the first release, so no office has to change how it works on day one.',
    effect:
      'The member sees what the rule required, what their record actually says, and the gap between the two. Repeat filings on the same defect fall, and repeat filings are pure cost to the field office.',
    spec: `{
  "rule_id":            "EPF-1952-68B",
  "required_value":     { "months_of_service": 60 },
  "actual_value":       { "months_of_service": 28 },
  "remedy_code":        "EMPLOYER_ECR_CORRECTION",
  "responsible_owner":  "TRANSFEROR_FIELD_OFFICE",
  "appeal_by":          "2026-10-14"
}`,
  },
  {
    n: '02',
    title: 'Publish the phrase to code mapping',
    today:
      'The same defect is described differently by different offices. Nobody outside EPFO can tell that two remarks mean the same thing, so no one can measure which defects are actually causing rejections nationally.',
    change:
      'Publish a read-only mapping from the existing free text phrasings to the structured codes in change 01. This is a table, not a system, and it can ship before any workflow changes.',
    effect:
      'Rejections become countable. Today nobody can say how many claims fail on employer ECR mismatch versus service shortfall, because the reason lives in prose.',
    spec: `GET /reference/rejection-codes

[
  { "code": "EMPLOYER_ECR_CORRECTION",
    "phrases": ["wage details not tallying with ECR",
                "ECR mismatch, get rectified by employer"] },
  { "code": "SERVICE_SHORTFALL",
    "phrases": ["insufficient service", "service less than required"] }
]`,
  },
  {
    n: '03',
    title: 'Show the member the clock that already exists',
    today:
      "The Citizens' Charter commits to settling a complete claim in 20 days. The member is never shown that number, never told which day they are on, and never told what becomes available when it passes. The commitment exists and is invisible to the only person it is for.",
    change:
      'Return the charter limit and the elapsed count against the claim, and return the escalation route that is currently available rather than the full list.',
    effect:
      'Grievances arrive at the right stage instead of on day 3, when they are premature, or on day 90, when the member has given up. The office receives fewer unactionable grievances, not more.',
    spec: `GET /claim/{ref}/clock

{
  "filed_on":       "2026-07-08",
  "charter_limit":  20,
  "days_elapsed":   27,
  "overdue_by":     7,
  "next_route":     "EPFIGMS",
  "route_opens_on": "2026-07-29"
}`,
  },
  {
    n: '04',
    title: 'Name the role holding the file',
    today:
      'A member chases "EPFO", which is not a person. The file is with a dealing assistant, a section supervisor or an accounts officer depending on the stage, and the member has no way to know which.',
    change:
      'Return the role, not the individual. A role is enough to write a useful grievance and it raises no privacy question about naming a specific officer publicly.',
    effect:
      'This is the change that makes the 12% penal interest provision mean anything. Interest recoverable from the responsible official is a dead letter while the member cannot identify which desk the delay sits on.',
    spec: `{
  "stage":            "UNDER_PROCESS",
  "owner_role":       "SECTION_SUPERVISOR",
  "owner_office":     "RO_BENGALURU_PEENYA"
  // deliberately a role and an office. never a named individual.
}`,
  },
];

const NOT_REQUIRED = [
  'A new portal. Every change above is a field on a response the member portal already returns.',
  'A change to the claim settlement software. Changes 02, 03 and 04 are read-only projections of data EPFO already holds.',
  'A rule change or an amendment. The 20 day limit and the penal interest provision already exist. These changes only make them visible to the person they are for.',
  'Naming any individual officer. Change 04 returns a role and an office.',
  'A big-bang rollout. Change 01 can be optional at first and mandatory for the twenty most common reasons once offices are used to it.',
];

export default function ProposalPage() {
  return (
    <main className="spec">
      <p className="spec-eyebrow">The part a better interface cannot fix</p>
      <h1 className="spec-title">What EPFO should return</h1>
      <p className="spec-lead">
        Everything else in this product is a workaround. The decoder exists because a
        rejection arrives as a sentence instead of a record. The clock exists because a
        commitment EPFO has already made is never shown to the member it was made to.
      </p>
      <p className="spec-lead">
        These are the four changes that would make this product unnecessary. Each is
        additive to something that already exists, and none of them requires a new system.
      </p>

      <ol className="spec-list">
        {CHANGES.map((c) => (
          <li key={c.n} className="spec-item">
            <div className="spec-item-head">
              <span className="spec-n">{c.n}</span>
              <h2 className="spec-h2">{c.title}</h2>
            </div>
            <div className="spec-grid">
              <div>
                <p className="spec-label">Today</p>
                <p className="spec-p">{c.today}</p>
                <p className="spec-label">The change</p>
                <p className="spec-p">{c.change}</p>
                <p className="spec-label">Why it is worth doing</p>
                <p className="spec-p">{c.effect}</p>
              </div>
              <pre className="spec-code">{c.spec}</pre>
            </div>
          </li>
        ))}
      </ol>

      <section className="spec-box">
        <h2 className="spec-h2">What this does not require</h2>
        <ul className="spec-ul">
          {NOT_REQUIRED.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <section className="spec-box">
        <h2 className="spec-h2">What the OpenAI model does today, and what it would raise</h2>
        <p className="spec-p">
          One model is load-bearing in this product right now. Three more would each remove
          a real limitation, and it is more useful to name them with their cost than to
          pretend the prototype has no ceiling.
        </p>
        <div className="spec-modeltable">
          {MODEL_ROLES.map((r) => (
            <div key={r.job} className="spec-modelrow">
              <div>
                <p className="spec-model-job">{r.job}</p>
                <p className="spec-model-name">
                  {r.model}
                  <span className={r.live ? 'spec-pill live' : 'spec-pill'}>
                    {r.live ? 'live now' : 'would raise the ceiling'}
                  </span>
                </p>
              </div>
              <p className="spec-p">{r.today}</p>
              <p className="spec-model-cost">{r.cost}</p>
            </div>
          ))}
        </div>
        <p className="spec-p spec-model-note">
          Costs are order-of-magnitude estimates from published token pricing, not measured
          invoices. They are here because a proposal that ignores what it costs to run is not
          a proposal.
        </p>
      </section>

      <section className="spec-box spec-box-quiet">
        <h2 className="spec-h2">What we could not verify</h2>
        <p className="spec-p">
          We have no access to EPFO&rsquo;s internal claim settlement system and did not
          attempt to obtain any. The field names above are ours. The claim is not that
          these exact keys are correct, but that these four values are the ones missing,
          and that a member portal returning all four could not produce the experience
          this product exists to work around.
        </p>
        <p className="spec-p">
          The prototype implements this contract against synthetic claims, which is what
          the decoder validates its output into before anything is shown.
        </p>
      </section>

      <p className="spec-back">
        <a href="/">Back to PF Precheck</a>
      </p>
    </main>
  );
}
