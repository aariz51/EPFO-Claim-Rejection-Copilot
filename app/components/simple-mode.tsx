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
    setStep(0);
    setFiledDays(null);
    setDoc('none');
  };

  /* ---------------------------------------------------------------- */

  if (journey === null) {
    return (
      <div className="simple-wrap">
        <p className="simple-kicker">{t('tagline', lang)}</p>
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
      </div>
    );
  }

  if (journey === 'before' || journey === 'rejected') {
    // These two already have a strong detailed flow. Hand over rather than
    // build a worse second copy of it.
    return (
      <div className="simple-wrap">
        <BackLink onClick={reset} label={t('back', lang)} />
        <h1 className="simple-question">
          {journey === 'before' ? t('opt_before', lang) : t('opt_rejected', lang)}
        </h1>
        <p className="simple-lead">
          {lang === 'hi'
            ? 'इसके लिए हमें कुछ और जानकारी चाहिए। विस्तृत जानकारी खोलिए।'
            : 'This one needs a few more details. Open the detailed view.'}
        </p>
        <button type="button" className="simple-primary" onClick={onDetailed}>
          {t('detailed', lang)} <ArrowRight size={22} aria-hidden />
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
                ? '12% दंडात्मक ब्याज लागू हो सकता है'
                : '12% penal interest may apply'}
            </p>
            <p className="penal-body">{verdict.penalInterest.note}</p>
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
