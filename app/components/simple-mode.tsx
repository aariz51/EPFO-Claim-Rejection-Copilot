'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarClock,
  Clock,
  FileWarning,
  Gavel,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { AssistPrefs } from '../lib/assist';
import { speak, stopSpeaking, t } from '../lib/assist';
import { assessStatus, delayGrievance, delayRti, type StatusStage } from '../lib/claim-status';
import {
  evaluateClaim,
  formatCurrency,
  sampleRecord,
  type Form31Purpose,
} from '../lib/claim-engine';

interface DecodePayload {
  rule_id: string;
  title: string;
  plain_en: string;
  plain_hi: string;
  required_value: string | null;
  actual_value: string | null;
  remedy_code: string;
  remedy_en: string;
  responsible_owner: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'rules' | 'openai' | 'rules-fallback';
  note?: string;
}

type Journey = null | 'before' | 'waiting' | 'rejected';

/**
 * Simple mode.
 *
 * One question per screen. Every option is an icon plus a short sentence, never
 * a bare label. Targets are large enough to hit with a thumb on a cracked
 * screen. Nothing here needs a scroll to find the button that continues.
 */
export function SimpleMode({
  prefs,
  onDetailed,
  onSpeakingChange,
}: {
  prefs: AssistPrefs;
  onDetailed: () => void;
  onSpeakingChange: (b: boolean) => void;
}) {
  const lang = prefs.lang;
  const [journey, setJourney] = useState<Journey>(null);
  const [step, setStep] = useState(0);

  // waiting-journey answers
  const [filedDays, setFiledDays] = useState<number | null>(null);
  const [stage, setStage] = useState<StatusStage>('submitted');
  // Fixed for the demo record. The engine takes it as an input either way.
  const amount = 120000;
  const [doc, setDoc] = useState<'none' | 'grievance' | 'rti'>('none');
  const [purpose, setPurpose] = useState<Form31Purpose | null>(null);
  const [wantAmount, setWantAmount] = useState<number | null>(null);
  const [rejectText, setRejectText] = useState('');
  const [decoded, setDecoded] = useState<DecodePayload | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const liveRef = useRef<HTMLDivElement>(null);

  const filedOn = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (filedDays ?? 0));
    return d.toISOString();
  }, [filedDays]);

  const verdict = useMemo(
    () =>
      filedDays === null
        ? null
        : assessStatus({
            filedOn,
            claimType: '31',
            amount,
            stage,
            office: 'Regional Office, Bengaluru (Peenya)',
            grievanceRaised: false,
            lang,
          }),
    [filedOn, filedDays, amount, stage, lang]
  );

  /** What this screen should say out loud. */
  const spokenText = useMemo(() => {
    if (journey === null) {
      return [t('q_what', lang), t('opt_before', lang), t('opt_waiting', lang), t('opt_rejected', lang)].join('. ');
    }
    if (journey === 'waiting') {
      if (step === 0) return t('q_filed_when', lang);
      if (step === 1) return t('q_status_now', lang);
      if (verdict) {
        const late =
          verdict.overdueBy > 0
            ? lang === 'hi'
              ? `आपका क्लेम ${verdict.overdueBy} दिन देर से है। ${t('limit_is', lang)}।`
              : `Your claim is ${verdict.overdueBy} days past the limit. ${t('limit_is', lang)}.`
            : lang === 'hi'
              ? 'अभी देरी नहीं हुई है। थोड़ा और इंतज़ार कीजिए।'
              : 'This is not late yet. Please wait a little longer.';
        return late;
      }
    }
    return '';
  }, [journey, step, verdict, lang]);

  // Speak the screen whenever it changes and speech is on.
  useEffect(() => {
    if (!prefs.speak || !spokenText) {
      stopSpeaking();
      onSpeakingChange(false);
      return;
    }
    speak(spokenText, lang);
    onSpeakingChange(true);
    const id = setInterval(() => {
      if (typeof window !== 'undefined' && !window.speechSynthesis.speaking) {
        onSpeakingChange(false);
        clearInterval(id);
      }
    }, 400);
    return () => {
      clearInterval(id);
      stopSpeaking();
    };
  }, [spokenText, prefs.speak, lang, onSpeakingChange]);

  const you = prefs.assisted
    ? { poss: lang === 'hi' ? 'उनका' : 'their', subj: lang === 'hi' ? 'उन्होंने' : 'they' }
    : { poss: lang === 'hi' ? 'आपका' : 'your', subj: lang === 'hi' ? 'आपने' : 'you' };

  const reset = () => {
    setJourney(null);
    setPurpose(null);
    setWantAmount(null);
    setStep(0);
    setFiledDays(null);
    setDoc('none');
  };

  /* ---------------------------------------------------------------- */

  if (journey === null) {
    return (
      <div className="simple-wrap">
        <p className="simple-kicker">{t('tagline', lang)}</p>
        <p className="simple-kicker-sub">{t('taglineSub', lang)}</p>
        <h1 className="simple-question">{t('q_what', lang)}</h1>

        <div className="simple-choices">
          <BigChoice
            icon={<Banknote size={30} aria-hidden />}
            title={t('opt_before', lang)}
            sub={t('opt_before_sub', lang)}
            tone="teal"
            onClick={() => setJourney('before')}
          />
          <BigChoice
            icon={<Clock size={30} aria-hidden />}
            title={t('opt_waiting', lang)}
            sub={t('opt_waiting_sub', lang)}
            tone="amber"
            onClick={() => { setJourney('waiting'); setStep(0); }}
          />
          <BigChoice
            icon={<FileWarning size={30} aria-hidden />}
            title={t('opt_rejected', lang)}
            sub={t('opt_rejected_sub', lang)}
            tone="rose"
            onClick={() => setJourney('rejected')}
          />
        </div>

        <p className="simple-note">{t('synthetic', lang)}</p>
        <p className="simple-spec-link">
          <a href="/proposal">{t('specLink', lang)} &rarr;</a>
        </p>
      </div>
    );
  }

  if (journey === 'before') {
    /* The pre-file journey, run in simple mode rather than handed off.
       Every check below is the engine's own rule with its real numbers, so the
       member sees "the rule wants 60 months, your record says 28" rather than
       "you may not be eligible". */
    const PURPOSES: { id: Form31Purpose; key: string }[] = [
      { id: 'housing', key: 'p_housing' },
      { id: 'illness', key: 'p_illness' },
      { id: 'marriage', key: 'p_marriage' },
      { id: 'education', key: 'p_education' },
    ];

    if (!purpose) {
      return (
        <div className="simple-wrap">
          <BackLink onClick={reset} label={t('back', lang)} />
          <h1 className="simple-question">{t('q_purpose', lang)}</h1>
          <div className="simple-choices">
            {PURPOSES.map((p) => (
              <BigChoice
                key={p.id}
                icon={<Banknote size={30} aria-hidden />}
                title={t(p.key, lang)}
                sub=""
                tone="teal"
                onClick={() => setPurpose(p.id)}
              />
            ))}
          </div>
          <p className="simple-note">{t('synthetic', lang)}</p>
        </div>
      );
    }

    if (wantAmount === null) {
      const presets = [50000, 100000, 200000, 400000];
      return (
        <div className="simple-wrap">
          <BackLink onClick={() => setPurpose(null)} label={t('back', lang)} />
          <h1 className="simple-question">{t('q_howmuch', lang)}</h1>
          <div className="simple-choices">
            {presets.map((a) => (
              <BigChoice
                key={a}
                icon={<Banknote size={30} aria-hidden />}
                title={formatCurrency(a)}
                sub=""
                tone="teal"
                onClick={() => setWantAmount(a)}
              />
            ))}
          </div>
          <p className="simple-note">{t('synthetic', lang)}</p>
        </div>
      );
    }

    const report = evaluateClaim(sampleRecord, '31', purpose, wantAmount);
    const failing = report.checks.filter((c) => c.status !== 'pass');

    return (
      <div className="simple-wrap">
        <BackLink onClick={() => setWantAmount(null)} label={t('back', lang)} />
        <div className={report.status === 'ready' ? 'verdict-card ok' : 'verdict-card warn'}>
          <p className="verdict-head">
            {t(report.status === 'ready' ? 'will_clear' : 'will_fail', lang)}
          </p>
          <p className="verdict-sub">
            {report.checks.length} {t('checks_ran', lang)}
            {failing.length > 0 ? ` \u00b7 ${failing.length}` : ''}
          </p>
        </div>

        <p className="prefile-max">
          {t('max_eligible', lang)}: <strong>{formatCurrency(report.maximumEligibleAmount)}</strong>
        </p>

        {report.notTheBlocker ? (
          <div className="red-herring">
            <p className="rh-head">{t('not_blocker', lang)}: {report.notTheBlocker.label}</p>
            <p className="rh-body">{report.notTheBlocker.why}</p>
          </div>
        ) : null}

        <ol className="prefile-checks">
          {report.checks.map((c) => (
            <li key={c.id} className={c.status === 'pass' ? 'chk pass' : 'chk fail'}>
              <span className="chk-mark" aria-hidden>{c.status === 'pass' ? '\u2713' : '\u2717'}</span>
              <div>
                <p className="chk-label">{c.label}</p>
                <div className="chk-nums">
                  <span><em>{t('rule_wanted', lang)}</em> {c.required}</span>
                  <span><em>{t('you_have', lang)}</em> {c.actual}</span>
                  {c.gap ? <span className="chk-gap">{c.gap}</span> : null}
                </div>
                {c.status !== 'pass' && c.remedy ? (
                  <p className="chk-remedy"><strong>{t('fix_this', lang)}: </strong>{c.remedy}</p>
                ) : null}
                <p className="chk-rule">
                  {c.ruleId} · {t('rule_version', lang)} {c.ruleVersion} · {c.effectiveFrom}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <button type="button" className="simple-secondary" onClick={onDetailed}>
          {t('detailed', lang)} <ArrowRight size={20} aria-hidden />
        </button>
        <p className="simple-note">{t('synthetic', lang)}</p>
      </div>
    );
  }

  if (journey === 'rejected') {
    const runDecode = async () => {
      if (!rejectText.trim()) return;
      setDecoding(true);
      setDecodeError(null);
      try {
        const r = await fetch('/api/decode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rejectText, lang }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? 'Could not read that message');
        setDecoded(j as DecodePayload);
      } catch (e) {
        setDecodeError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setDecoding(false);
      }
    };

    return (
      <div className="simple-wrap wide">
        <BackLink onClick={reset} label={t('back', lang)} />
        <h1 className="simple-question">
          {lang === 'hi' ? 'रिजेक्शन का संदेश यहाँ लिखिए' : 'Paste the rejection message here'}
        </h1>
        <p className="simple-lead">
          {lang === 'hi'
            ? 'जो भी एसएमएस या टिप्पणी मिली है, जस की तस चिपका दीजिए। हम उसे आसान भाषा में समझाएंगे।'
            : 'Paste the SMS or the remark exactly as you received it. We will turn it into plain words.'}
        </p>

        <textarea
          className="simple-textarea"
          rows={4}
          value={rejectText}
          onChange={(e) => setRejectText(e.target.value)}
          placeholder={
            lang === 'hi'
              ? 'जैसे: Claim rejected related to migration to CITES.'
              : 'For example: Claim rejected related to migration to CITES.'
          }
          aria-label={lang === 'hi' ? 'रिजेक्शन का संदेश' : 'Rejection message'}
        />

        <button type="button" className="simple-primary" onClick={runDecode} disabled={decoding || !rejectText.trim()}>
          {decoding
            ? lang === 'hi' ? 'समझा जा रहा है...' : 'Reading it...'
            : lang === 'hi' ? 'आसान भाषा में समझाइए' : 'Explain this to me'}
        </button>

        {decodeError && <p className="decode-error" role="alert">{decodeError}</p>}

        {decoded && !decoding && (
          <div className="decode-card">
            <div className="decode-head">
              <span className={`decode-src ${decoded.source}`}>
                {decoded.source === 'openai'
                  ? lang === 'hi' ? 'ओपनएआई मॉडल से' : 'Decoded by an OpenAI model'
                  : decoded.source === 'rules'
                    ? lang === 'hi' ? 'सत्यापित नियम से' : 'Matched a verified rule'
                    : lang === 'hi' ? 'अंतर्निहित फ़ॉलबैक' : 'Built-in fallback'}
              </span>
              <span className={`decode-conf ${decoded.confidence}`}>
                {lang === 'hi' ? 'भरोसा' : 'confidence'}: {decoded.confidence}
              </span>
            </div>

            <h2 className="decode-title">{decoded.title}</h2>
            <p className="decode-plain">{lang === 'hi' && decoded.plain_hi ? decoded.plain_hi : decoded.plain_en}</p>

            {(decoded.required_value || decoded.actual_value) && (
              <div className="decode-gap">
                <div>
                  <p className="decode-gap-k">{lang === 'hi' ? 'नियम चाहता है' : 'Rule requires'}</p>
                  <p className="decode-gap-v">{decoded.required_value ?? '-'}</p>
                </div>
                <div>
                  <p className="decode-gap-k">{lang === 'hi' ? 'आपके रिकॉर्ड में' : 'Your record has'}</p>
                  <p className="decode-gap-v">{decoded.actual_value ?? '-'}</p>
                </div>
              </div>
            )}

            <p className="decode-do">
              <strong>{lang === 'hi' ? 'अब क्या कीजिए: ' : 'What to do: '}</strong>
              {decoded.remedy_en}
            </p>
            <p className="decode-owner">
              {lang === 'hi' ? 'किसे ठीक करना है: ' : 'Who must fix it: '}
              <strong>{decoded.responsible_owner}</strong>
            </p>

            {decoded.note && <p className="decode-note">{decoded.note}</p>}

            {/* The contract this project argues EPFO should return directly. */}
            <details className="decode-contract">
              <summary>
                {lang === 'hi'
                  ? 'ईपीएफओ को यही जानकारी सीधे देनी चाहिए'
                  : 'This is what EPFO should return directly'}
              </summary>
              <pre>{JSON.stringify(
                {
                  rule_id: decoded.rule_id,
                  required_value: decoded.required_value,
                  actual_value: decoded.actual_value,
                  remedy_code: decoded.remedy_code,
                  responsible_owner: decoded.responsible_owner,
                },
                null,
                2
              )}</pre>
            </details>
          </div>
        )}

        <button type="button" className="simple-ghost" onClick={reset}>
          <ArrowLeft size={20} aria-hidden /> {lang === 'hi' ? 'शुरू से' : 'Start again'}
        </button>
      </div>
    );
  }

  /* ---- the waiting journey ---------------------------------------- */

  if (step === 0) {
    const options: Array<{ d: number; en: string; hi: string }> = [
      { d: 3, en: 'A few days ago', hi: 'कुछ दिन पहले' },
      { d: 12, en: 'About two weeks ago', hi: 'लगभग दो हफ़्ते पहले' },
      { d: 27, en: 'About a month ago', hi: 'लगभग एक महीने पहले' },
      { d: 55, en: 'About two months ago', hi: 'लगभग दो महीने पहले' },
      { d: 95, en: 'More than three months ago', hi: 'तीन महीने से ज़्यादा' },
    ];
    return (
      <div className="simple-wrap">
        <BackLink onClick={reset} label={t('back', lang)} />
        <h1 className="simple-question">{t('q_filed_when', lang)}</h1>
        <div className="simple-choices">
          {options.map((o) => (
            <BigChoice
              key={o.d}
              icon={<CalendarClock size={28} aria-hidden />}
              title={lang === 'hi' ? o.hi : o.en}
              tone="plain"
              onClick={() => { setFiledDays(o.d); setStep(1); }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (step === 1) {
    const stages: Array<{ v: StatusStage; en: string; hi: string }> = [
      { v: 'submitted', en: 'Submitted at portal', hi: 'पोर्टल पर जमा है' },
      { v: 'under-process', en: 'Under process', hi: 'प्रक्रिया में है' },
      { v: 'approved', en: 'Approved, money not received', hi: 'मंज़ूर, पर पैसा नहीं आया' },
    ];
    return (
      <div className="simple-wrap">
        <BackLink onClick={() => setStep(0)} label={t('back', lang)} />
        <h1 className="simple-question">{t('q_status_now', lang)}</h1>
        <div className="simple-choices">
          {stages.map((s) => (
            <BigChoice
              key={s.v}
              icon={<ShieldAlert size={28} aria-hidden />}
              title={lang === 'hi' ? s.hi : s.en}
              tone="plain"
              onClick={() => { setStage(s.v); setStep(2); }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!verdict) return null;

  const tone =
    verdict.severity === 'on-track' ? 'ok' : verdict.severity === 'watch' ? 'warn' : 'crit';

  return (
    <div className="simple-wrap wide" ref={liveRef}>
      <BackLink onClick={() => setStep(1)} label={t('back', lang)} />

      {/* The number, enormous, before anything else. */}
      <div className={`verdict-card ${tone}`}>
        <p className="verdict-label">
          {lang === 'hi' ? `${you.poss} क्लेम को हुए` : `${you.poss} claim has been waiting`}
        </p>
        <p className="verdict-number">
          {verdict.daysElapsed}
          <span>{lang === 'hi' ? ' दिन' : ' days'}</span>
        </p>

        {/* A bar, not a paragraph. The limit is a physical line you can see. */}
        <div className="verdict-bar" aria-hidden>
          <div className="verdict-bar-track">
            <div
              className="verdict-bar-fill"
              style={{ width: `${Math.min(100, (verdict.daysElapsed / 45) * 100)}%` }}
            />
            <div
              className="verdict-bar-limit"
              style={{ left: `${(verdict.charterLimit / 45) * 100}%` }}
            >
              <span>20</span>
            </div>
          </div>
        </div>
        <p className="verdict-limit-note">{t('limit_is', lang)}</p>

        {verdict.overdueBy > 0 && (
          <p className="verdict-late">
            {verdict.overdueBy} {t('days_late', lang)}
          </p>
        )}
      </div>

      <p className="simple-lead">{verdict.summary}</p>

      {verdict.migrationNote && (
        <div className="simple-inline-note">
          <Sparkles size={18} aria-hidden /> {verdict.migrationNote}
        </div>
      )}

      {/* Who is holding it. "EPFO" is not a person. */}
      <div className="owner-card">
        <p className="owner-role">{verdict.owner.role}</p>
        <p className="owner-name">{verdict.owner.name}</p>
        <p className="owner-does">{verdict.owner.whatTheyDo}</p>
      </div>

      {verdict.penalInterest.applies && (
        <div className="penal-card">
          <Gavel size={20} aria-hidden />
          <div>
            <p className="penal-head">
              {lang === 'hi'
                ? 'इस देरी की कीमत, आपके क्लेम पर'
                : 'What this delay is worth, on your claim'}
            </p>
            {verdict.penalInterest.amount > 0 && (
              <p className="penal-amount">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(verdict.penalInterest.amount)}
              </p>
            )}
            <p className="penal-body">
              {lang === 'hi'
                ? `${verdict.overdueBy} दिन की देरी पर 12% सालाना की दर से, आपके क्लेम की रकम पर। यह रकम विभाग से नहीं, ज़िम्मेदार अधिकारी से वसूली जा सकती है। यही आपकी असली पकड़ है।`
                : `At 12% a year, on your claim amount, for the ${verdict.overdueBy} day${verdict.overdueBy === 1 ? '' : 's'} you are past the limit. It is recoverable from the responsible official rather than from the department. That is the leverage.`}
            </p>
            <p className="penal-body penal-note">
              {lang === 'hi'
                ? 'यह अनुमान है, अंतिम गणना नहीं। शिकायत में यह आंकड़ा लिखिए और ईपीएफओ से इसकी जांच करने को कहिए।'
                : 'This is an estimate to put in writing, not a final settlement figure. Quote it and ask EPFO to examine it.'}
            </p>
          </div>
        </div>
      )}

      {/* The ladder, in order, with what it costs and what it does. */}
      <h2 className="simple-subhead">
        {lang === 'hi' ? 'अब क्या कीजिए' : 'What to do now'}
      </h2>
      <ol className="ladder">
        {verdict.unlocked.map((s, i) => (
          <li key={s.id}>
            <span className="ladder-num">{i + 1}</span>
            <div>
              <p className="ladder-title">{s.title}</p>
              <p className="ladder-detail">{s.detail}</p>
              <p className="ladder-meta">
                <span className="ladder-cost">{s.cost}</span>
                <span>{s.typicalEffect}</span>
              </p>
              {s.id === 'epfigms' && (
                <button type="button" className="simple-secondary" onClick={() => setDoc('grievance')}>
                  {lang === 'hi' ? 'शिकायत का मसौदा' : 'Draft the grievance'}
                </button>
              )}
              {s.id === 'rti' && (
                <button type="button" className="simple-secondary" onClick={() => setDoc('rti')}>
                  {lang === 'hi' ? 'आरटीआई का मसौदा' : 'Draft the RTI'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>

      {verdict.locked.length > 0 && (
        <p className="ladder-locked">
          {lang === 'hi'
            ? `${verdict.locked.length} और कदम बाद में खुलेंगे। अभी उनकी ज़रूरत नहीं है।`
            : `${verdict.locked.length} further steps unlock later. You do not need them yet.`}
        </p>
      )}

      {doc !== 'none' && (
        <div className="doc-out">
          <div className="doc-out-head">
            <p>{doc === 'grievance' ? 'Grievance to the Regional PF Commissioner' : 'RTI application'}</p>
            <button
              type="button"
              className="simple-secondary"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(
                    doc === 'grievance'
                      ? delayGrievance(
                          { filedOn, claimType: '31', amount, stage, office: 'Regional Office, Bengaluru (Peenya)', grievanceRaised: false },
                          verdict,
                          'CLM-DEMO-2408'
                        )
                      : delayRti(
                          { filedOn, claimType: '31', amount, stage, office: 'Regional Office, Bengaluru (Peenya)', grievanceRaised: false },
                          'CLM-DEMO-2408'
                        )
                  )
                  .catch(() => {})
              }
            >
              {lang === 'hi' ? 'कॉपी कीजिए' : 'Copy'}
            </button>
          </div>
          <pre>
            {doc === 'grievance'
              ? delayGrievance(
                  { filedOn, claimType: '31', amount, stage, office: 'Regional Office, Bengaluru (Peenya)', grievanceRaised: false },
                  verdict,
                  'CLM-DEMO-2408'
                )
              : delayRti(
                  { filedOn, claimType: '31', amount, stage, office: 'Regional Office, Bengaluru (Peenya)', grievanceRaised: false },
                  'CLM-DEMO-2408'
                )}
          </pre>
        </div>
      )}

      <button type="button" className="simple-ghost" onClick={reset}>
        <ArrowLeft size={20} aria-hidden /> {lang === 'hi' ? 'शुरू से' : 'Start again'}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BigChoice({
  icon,
  title,
  sub,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  tone: 'teal' | 'amber' | 'rose' | 'plain';
  onClick: () => void;
}) {
  return (
    <button type="button" className={`big-choice ${tone}`} onClick={onClick}>
      <span className="big-choice-icon">{icon}</span>
      <span className="big-choice-text">
        <span className="big-choice-title">{title}</span>
        {sub && <span className="big-choice-sub">{sub}</span>}
      </span>
      <ArrowRight size={22} className="big-choice-arrow" aria-hidden />
    </button>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="simple-back" onClick={onClick}>
      <ArrowLeft size={20} aria-hidden /> {label}
    </button>
  );
}
