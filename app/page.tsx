
/**
 * The public landing page.
 *
 * Deliberately not the app. A member arriving from a search result or a
 * WhatsApp forward needs to know what this is and whether it is official before
 * they trust it with anything. The workspace lives at /app so the urgent
 * journeys never share a screen with explanation.
 *
 * Design follows the same accessibility rules as the app rather than switching
 * to a marketing register: Atkinson Hyperlegible, large type, high contrast,
 * and no motion that carries meaning.
 */

export const metadata = {
  title: 'PF Precheck - it is your money',
  description:
    "EPFO's own charter gives it 20 days. PF Precheck counts your claim against that limit, names the role holding your file, and computes what the delay is worth in rupees.",
};

const SITUATIONS = [
  {
    tag: 'Before you apply',
    title: 'I want to take money out',
    body: 'Check whether the rules will actually approve it, before you file and lose a month finding out.',
  },
  {
    tag: 'While you wait',
    title: 'I applied, the money has not come',
    body: "See which day you are on against EPFO's 20 day limit, who is holding the file, and what the delay is worth to you in rupees.",
  },
  {
    tag: 'After a rejection',
    title: 'My claim was rejected',
    body: 'Paste the remark and see the exact number the rule wanted beside the number on your record, in plain words.',
  },
];

/* Every figure here carries where it came from. A product whose whole argument is
   that EPFO should return checkable numbers cannot itself state uncheckable ones. */
const FACTS = [
  {
    n: '20 days',
    l: "EPFO's own Citizens' Charter limit for settling a complete claim",
    src: "EPFO Citizens' / Clients' Charter",
  },
  {
    n: '12%',
    l: 'penal interest on unjustified delay, recoverable from the responsible official rather than from the department',
    src: 'EPFO claim settlement norms',
  },
  {
    n: '1 in 3',
    l: 'final settlement claims rejected. Across all claim types it is closer to one in four, and the reason is usually two words with no number attached',
    src: 'Reported EPFO claim data, 2023-24',
  },
];

export default function Landing() {
  return (
    <main className="lp">
      <header className="lp-top">
        <span className="lp-brand">
          <span className="brand-mark" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          PF Precheck
        </span>
        <nav className="lp-nav">
          <a href="/proposal">What EPFO should return</a>
          <a href="/app" className="lp-nav-cta">
            Open the app
          </a>
        </nav>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
        <p className="lp-eyebrow">
          Independent prototype &middot; powered by an OpenAI model &middot; synthetic data
        </p>
        <h1 className="lp-h1">
          It is your money.
          <br />
          This gives you something to hold them to.
        </h1>
        <p className="lp-lead">
          When an EPF claim stalls, a member is told nothing and has nothing to point at. But
          EPFO already promised to settle a complete claim in twenty days, and an unjustified
          delay past that already attracts twelve percent penal interest, recoverable from the
          official responsible rather than from the department.
        </p>
        <p className="lp-lead">
          Almost nobody is told either of those things. PF Precheck counts your claim against
          that limit, names the role holding your file, works out what the delay is worth in
          rupees, and writes the grievance that says so.
        </p>
        <p className="lp-system-claim">
          <strong>Not a replacement portal.</strong> Four fields added to a response the
          member portal already returns, and a clock EPFO has already committed to. No new
          system, no rule change, no naming of any individual officer.
        </p>
        <div className="lp-cta-row">
          <a href="/app" className="lp-cta">
            Open PF Precheck &rarr;
          </a>
          <a href="/proposal" className="lp-cta-ghost">
            Read the system proposal
          </a>
        </div>
        <p className="lp-chips">
          <span>NO UAN, NO OTP, NO LOGIN</span>
          <span>ENGLISH + हिंदी</span>
          <span>READS ALOUD</span>
          <span>SYNTHETIC DATA</span>
        </p>
        </div>

        {/* A specimen of the actual verdict, so the product is visible before
            anyone clicks. Static markup: the real numbers are computed in /app
            from the member's own dates. */}
        <aside className="lp-spec" aria-label="Example of what the app returns">
          <p className="lp-spec-tag">Example claim, synthetic</p>
          <div className="lp-spec-clock">
            <span className="lp-spec-day">Day 27</span>
            <span className="lp-spec-of">of a 20 day limit</span>
          </div>
          <div className="lp-spec-bar" aria-hidden>
            <span style={{ width: '74%' }} />
          </div>
          <p className="lp-spec-over">7 days past the charter limit</p>

          <div className="lp-spec-row">
            <p className="lp-spec-label">What this delay is worth to you</p>
            <p className="lp-spec-amount">₹276</p>
            <p className="lp-spec-sub">
              12% a year on a ₹1,20,000 claim, for the 7 days past the limit. Recoverable
              from the responsible official, not from the department.
            </p>
          </div>

          <div className="lp-spec-row">
            <p className="lp-spec-label">Who is holding the file</p>
            <p className="lp-spec-owner">Dealing Assistant</p>
            <p className="lp-spec-sub">Field office, claims section</p>
          </div>

          <div className="lp-spec-foot">
            <span className="lp-spec-open">EPFiGMS open</span>
            <span className="lp-spec-open">RTI open</span>
            <span className="lp-spec-shut">CPGRAMS, day 45</span>
          </div>
        </aside>
      </section>

      <section className="lp-facts">
        {FACTS.map((f) => (
          <div key={f.n} className="lp-fact">
            <p className="lp-fact-n">{f.n}</p>
            <p className="lp-fact-l">{f.l}</p>
            <p className="lp-fact-src">{f.src}</p>
          </div>
        ))}
      </section>

      <section className="lp-block">
        <p className="lp-kicker">Three ways in</p>
        <h2 className="lp-h2">Whichever point you are stuck at.</h2>
        <div className="lp-cards">
          {SITUATIONS.map((s) => (
            <a key={s.title} href="/app" className="lp-card">
              <p className="lp-card-tag">{s.tag}</p>
              <h3 className="lp-card-title">{s.title}</h3>
              <p className="lp-card-body">{s.body}</p>
              <p className="lp-card-go">Start here &rarr;</p>
            </a>
          ))}
        </div>
      </section>

      <section className="lp-block lp-block-alt">
        <p className="lp-kicker">How it works</p>
        <h2 className="lp-h2">The ladder unlocks by day, not all at once.</h2>
        <p className="lp-block-lead">
          A grievance filed on day three is rejected as premature and burns the strongest
          weeks. So each route appears only when it actually becomes available, with what it
          costs and what it typically does.
        </p>
        <ol className="lp-ladder">
          {[
            ['Day 21', 'EPFiGMS grievance', 'The first formal route, once the charter limit has passed.'],
            ['Day 25', 'RTI, ten rupees', 'Asks who is holding the file and why. Hard to ignore.'],
            ['Day 30', 'Penal interest claim', 'Names the twelve percent and the responsible official.'],
            ['Day 45', 'CPGRAMS', 'Escalates outside the office that is sitting on it.'],
          ].map(([d, t2, b]) => (
            <li key={d}>
              <span className="lp-ladder-day">{d}</span>
              <span>
                <strong>{t2}</strong>
                <span className="lp-ladder-body">{b}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-block">
        <p className="lp-kicker">Who it is built for</p>
        <h2 className="lp-h2">The person who cannot read the form.</h2>
        <div className="lp-two">
          <p>
            The median EPF member is not the person who enjoys a dashboard. So the default
            view asks one question at a time in large type, reads itself aloud, and lets the
            text size be raised twice without breaking the layout.
          </p>
          <p>
            Hindi is complete, including the advice and the drafted documents, not only the
            button labels. It is written in plain spoken Hindi rather than the Sanskritised
            register the official forms use, because a translation in the same register does
            not help someone who could not read the original.
          </p>
        </div>
      </section>

      <section className="lp-boundary">
        <p className="lp-kicker lp-kicker-light">Prototype boundary</p>
        <h2 className="lp-h2 lp-h2-light">Real rules. Synthetic claims.</h2>
        <p className="lp-boundary-body">
          PF Precheck is an independent hackathon prototype. It is not affiliated with or
          endorsed by EPFO. It does not connect to any EPFO system, and every claim, UAN,
          amount and date in it is invented. The rules, the charter limit, the penal interest
          provision and the escalation routes are real and are cited in the app. Known
          rejection phrasings are matched by a deterministic rule table; only unrecognised
          text reaches an OpenAI model, and its reply is validated into a fixed schema before
          anyone sees it. The app labels which of the two produced your answer.
        </p>
        <div className="lp-cta-row">
          <a href="/app" className="lp-cta lp-cta-light">
            Open PF Precheck &rarr;
          </a>
          <a href="/proposal" className="lp-cta-ghost lp-cta-ghost-light">
            What EPFO should return instead
          </a>
        </div>
      </section>
    </main>
  );
}
