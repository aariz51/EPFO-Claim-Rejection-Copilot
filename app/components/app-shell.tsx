'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ClaimCopilot } from './claim-copilot';
import { SimpleMode } from './simple-mode';
import { AssistBar } from './assist-bar';
import {
  DEFAULT_PREFS,
  SCALE_FACTOR,
  loadPrefs,
  savePrefs,
  stopSpeaking,
  t,
  type AssistPrefs,
} from '../lib/assist';

/**
 * Two front doors onto one engine.
 *
 * Simple mode is the default because the median EPF member is not the person
 * who enjoys a dashboard. Detailed mode is one tap away and is where HR staff,
 * CSC operators and confident members will live. Neither is a cut-down version
 * of the other: they run the same rules and show the same numbers.
 */
export function AppShell() {
  // Lazy initialiser rather than a setState inside an effect. On the server it
  // returns defaults, on the client it reads the stored preference on the very
  // first render, so there is no second render and no flash of the wrong mode.
  const [prefs, setPrefs] = useState<AssistPrefs>(() =>
    typeof window === 'undefined' ? DEFAULT_PREFS : loadPrefs()
  );
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [speaking, setSpeaking] = useState(false);

  const update = useCallback((p: AssistPrefs) => {
    setPrefs(p);
    savePrefs(p);
  }, []);

  // Drive type size from one variable so every rule scales together.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--scale', String(SCALE_FACTOR[prefs.scale]));
    document.documentElement.lang = prefs.lang === 'hi' ? 'hi' : 'en';
  }, [prefs.scale, prefs.lang]);

  useEffect(() => () => stopSpeaking(), []);

  // Render the detailed view on the server pass so first paint is never blank,
  // then swap once we know what this person actually chose last time.
  if (!hydrated) {
    return (
      <div className={prefs.lang === 'hi' ? 'deva' : undefined}>
        <ClaimCopilot />
      </div>
    );
  }

  return (
    <div className={prefs.lang === 'hi' ? 'deva' : undefined}>
      <AssistBar
        prefs={prefs}
        onChange={update}
        speaking={speaking}
        onSpeakToggle={() => {
          stopSpeaking();
          setSpeaking(false);
        }}
      />

      <div className="mode-switch">
        <button
          type="button"
          onClick={() => update({ ...prefs, mode: prefs.mode === 'simple' ? 'detailed' : 'simple' })}
        >
          {prefs.mode === 'simple' ? t('detailed', prefs.lang) : t('simple', prefs.lang)}
        </button>
      </div>

      {prefs.mode === 'simple' ? (
        <SimpleMode
          prefs={prefs}
          onDetailed={() => update({ ...prefs, mode: 'detailed' })}
          onSpeakingChange={setSpeaking}
        />
      ) : (
        <ClaimCopilot />
      )}
    </div>
  );
}
