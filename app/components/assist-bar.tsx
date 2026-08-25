'use client';

import { Volume2, VolumeX, Type, Users, Languages } from 'lucide-react';
import type { AssistPrefs, Lang } from '../lib/assist';
import { SCALE_FACTOR, t } from '../lib/assist';

/**
 * The accessibility bar. Deliberately the first thing in the DOM and always
 * visible, because for this audience these are not settings buried in a menu,
 * they are the controls that decide whether the page is usable at all.
 */
export function AssistBar({
  prefs,
  onChange,
  speaking,
  onSpeakToggle,
}: {
  prefs: AssistPrefs;
  onChange: (p: AssistPrefs) => void;
  speaking: boolean;
  onSpeakToggle: () => void;
}) {
  const set = (patch: Partial<AssistPrefs>) => onChange({ ...prefs, ...patch });
  const lang = prefs.lang;

  const cycleScale = () => {
    const order: AssistPrefs['scale'][] = ['normal', 'large', 'largest'];
    set({ scale: order[(order.indexOf(prefs.scale) + 1) % order.length] });
  };

  return (
    <div className="assist-bar" role="toolbar" aria-label="Reading and language controls">
      <div className="assist-bar-inner">
        {/* Language. Two buttons, not a dropdown: a dropdown is one more thing
            to learn and hides the option that half the audience needs. */}
        <div className="assist-group" role="group" aria-label="Language">
          <Languages size={18} aria-hidden />
          {(['en', 'hi'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              className={`assist-chip ${lang === l ? 'on' : ''}`}
              aria-pressed={lang === l}
              onClick={() => set({ lang: l })}
              lang={l === 'hi' ? 'hi' : 'en'}
            >
              {l === 'en' ? 'English' : 'हिंदी'}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`assist-chip wide ${prefs.speak ? 'on' : ''}`}
          aria-pressed={prefs.speak}
          onClick={() => {
            const next = !prefs.speak;
            set({ speak: next });
            if (!next) onSpeakToggle();
          }}
        >
          {speaking ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
          {t(speaking ? 'stop' : 'listen', lang)}
        </button>

        <button
          type="button"
          className={`assist-chip wide ${prefs.scale !== 'normal' ? 'on' : ''}`}
          onClick={cycleScale}
          aria-label={`${t('bigText', lang)}. Currently ${prefs.scale}.`}
        >
          <Type size={18} aria-hidden />
          {t('bigText', lang)}
          <span className="assist-scale-dots" aria-hidden>
            {(['normal', 'large', 'largest'] as const).map((s) => (
              <i key={s} className={SCALE_FACTOR[s] <= SCALE_FACTOR[prefs.scale] ? 'lit' : ''} />
            ))}
          </span>
        </button>

        {/* Assisted use is the norm here, not the exception. A CSC operator, an
            HR clerk or a son filling this in for a parent needs the wording to
            change from "your claim" to "their claim". */}
        <button
          type="button"
          className={`assist-chip wide ${prefs.assisted ? 'on' : ''}`}
          aria-pressed={prefs.assisted}
          onClick={() => set({ assisted: !prefs.assisted })}
        >
          <Users size={18} aria-hidden />
          {t('helping', lang)}
        </button>
      </div>
    </div>
  );
}
